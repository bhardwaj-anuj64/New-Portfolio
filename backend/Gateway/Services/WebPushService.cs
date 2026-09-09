using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using Gateway.Models;
using WebPush;

namespace Gateway.Services;

public class WebPushService : IWebPushService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromSeconds(60);

    private readonly ConcurrentDictionary<string, (string Code, DateTimeOffset ExpiresAt)> _challenges = new();
    private readonly ConcurrentDictionary<string, PushSubscriptionRequest> _subscriptions = new();
    private readonly object _fileLock = new();
    private readonly string _subscriptionsFilePath;
    private readonly WebPushClient _client = new();
    private readonly IConfiguration _config;
    private readonly ILogger<WebPushService> _logger;

    public WebPushService(IConfiguration config, IWebHostEnvironment env, ILogger<WebPushService> logger)
    {
        _config = config;
        _logger = logger;
        _subscriptionsFilePath = Path.Combine(env.ContentRootPath, "data", "push-subscriptions.json");
        LoadSubscriptions();
    }

    public async Task<OtpChallengeResponse> GenerateOtpAsync(CancellationToken cancellationToken)
    {
        EvictExpired();

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var challengeId = Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.Add(OtpLifetime);
        _challenges[challengeId] = (code, expiresAt);

        var delivered = await TryDispatchAsync(code, cancellationToken);
        if (!delivered)
        {
            // ponytail: console-only fallback — this is the path that actually runs until a real
            // device is subscribed via the authenticated dashboard.
            _logger.LogWarning("[ADMIN OTP — DEV FALLBACK] Code {Code} expires at {ExpiresAt:O}", code, expiresAt);
        }

        return new OtpChallengeResponse(challengeId, expiresAt, delivered ? "push" : "console");
    }

    public bool Verify(string challengeId, string code)
    {
        // Single-use: remove on first check whether or not it succeeds, so a leaked challengeId
        // can't be brute-forced with repeated verify attempts.
        if (!_challenges.TryRemove(challengeId, out var entry))
        {
            return false;
        }

        if (DateTimeOffset.UtcNow > entry.ExpiresAt || code.Length != entry.Code.Length)
        {
            return false;
        }

        // Constant-time comparison so a mismatching digit can't be inferred from response timing.
        var expected = System.Text.Encoding.UTF8.GetBytes(entry.Code);
        var actual = System.Text.Encoding.UTF8.GetBytes(code);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    public string? GetVapidPublicKey() => _config["WebPush:VapidPublicKey"];

    public void Subscribe(PushSubscriptionRequest subscription)
    {
        _subscriptions[subscription.Endpoint] = subscription;
        PersistSubscriptions();
    }

    private async Task<bool> TryDispatchAsync(string code, CancellationToken cancellationToken)
    {
        var publicKey = _config["WebPush:VapidPublicKey"];
        var privateKey = _config["WebPush:VapidPrivateKey"];
        var subject = _config["WebPush:VapidSubject"];

        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey) || _subscriptions.IsEmpty)
        {
            return false;
        }

        var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
        var payload = $"Level 5 access code for ANUJ-GATEWAY-01: {code} (expires in 60s)";

        var delivered = false;
        foreach (var subscription in _subscriptions.Values)
        {
            try
            {
                var pushSubscription = new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
                await _client.SendNotificationAsync(pushSubscription, payload, vapidDetails, cancellationToken: cancellationToken);
                delivered = true;
            }
            catch (Exception ex)
            {
                // Broad catch is deliberate: a single malformed or expired subscription (bad key
                // material, network blip, whatever) must never take down OTP generation for
                // every other — or the only — admin trying to log in.
                _logger.LogWarning(ex, "Push dispatch failed for a subscribed device");
                if (ex is WebPushException { StatusCode: HttpStatusCode.Gone or HttpStatusCode.NotFound })
                {
                    _subscriptions.TryRemove(subscription.Endpoint, out _);
                    PersistSubscriptions();
                }
            }
        }

        return delivered;
    }

    private void EvictExpired()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var (key, value) in _challenges)
        {
            if (value.ExpiresAt < now)
            {
                _challenges.TryRemove(key, out _);
            }
        }
    }

    // Subscriptions are the one piece of state here worth surviving a restart — OTP challenges
    // are 60s-lived by design, so losing them on deploy is a non-event.
    private void LoadSubscriptions()
    {
        if (!File.Exists(_subscriptionsFilePath)) return;

        try
        {
            var json = File.ReadAllText(_subscriptionsFilePath);
            var saved = JsonSerializer.Deserialize<PushSubscriptionRequest[]>(json) ?? [];
            foreach (var subscription in saved)
            {
                _subscriptions[subscription.Endpoint] = subscription;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load persisted push subscriptions from {Path}", _subscriptionsFilePath);
        }
    }

    private void PersistSubscriptions()
    {
        lock (_fileLock)
        {
            try
            {
                var dir = Path.GetDirectoryName(_subscriptionsFilePath)!;
                Directory.CreateDirectory(dir);

                var tempPath = _subscriptionsFilePath + ".tmp";
                File.WriteAllText(tempPath, JsonSerializer.Serialize(_subscriptions.Values));
                File.Move(tempPath, _subscriptionsFilePath, overwrite: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not persist push subscriptions to {Path}", _subscriptionsFilePath);
            }
        }
    }
}
