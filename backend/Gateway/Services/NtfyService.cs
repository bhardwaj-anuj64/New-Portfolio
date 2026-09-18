using System.Collections.Concurrent;
using System.Security.Cryptography;
using Gateway.Models;

namespace Gateway.Services;

// Replaces the old VAPID/Web Push subscription system: no browser subscription step, no per-
// device state to persist — a message is just an HTTP POST to a private ntfy.sh topic, read via
// the ntfy app. Used for both admin OTP delivery and deploy-failure alerts.
public class NtfyService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromSeconds(60);

    private readonly ConcurrentDictionary<string, (string Code, DateTimeOffset ExpiresAt)> _challenges = new();
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<NtfyService> _logger;

    public NtfyService(IConfiguration config, ILogger<NtfyService> logger)
    {
        _config = config;
        _logger = logger;
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    /// <summary>Generates a 6-digit OTP, stores it with a 60s TTL, and pushes it to the configured
    /// ntfy.sh topic — falling back to a console log when no topic is configured or the push fails.</summary>
    public async Task<OtpChallengeResponse> GenerateOtpAsync(CancellationToken cancellationToken)
    {
        EvictExpired();

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var challengeId = Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.Add(OtpLifetime);
        _challenges[challengeId] = (code, expiresAt);

        var payload = $"Level 5 access code for ANUJ-GATEWAY-01: {code} (expires in 60s)";
        var delivered = await SendAsync(payload, cancellationToken);
        if (!delivered)
        {
            // ponytail: console-only fallback — this is the path that actually runs until
            // Ntfy:Topic is configured on the server.
            _logger.LogWarning("[ADMIN OTP — DEV FALLBACK] Code {Code} expires at {ExpiresAt:O}", code, expiresAt);
        }

        return new OtpChallengeResponse(challengeId, expiresAt, delivered ? "push" : "console");
    }

    /// <summary>Constant-time, single-use verification. Each challengeId can be checked at most once.</summary>
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

    /// <summary>Posts an arbitrary message to the configured ntfy.sh topic — used for both OTP
    /// delivery and the deploy pipeline's failure notification.</summary>
    public async Task<bool> SendAsync(string message, CancellationToken cancellationToken)
    {
        var topic = _config["Ntfy:Topic"];
        if (string.IsNullOrWhiteSpace(topic))
        {
            return false;
        }

        try
        {
            using var content = new StringContent(message);
            var response = await _http.PostAsync($"https://ntfy.sh/{topic}", content, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            // Broad catch is deliberate: ntfy.sh being unreachable must never take down OTP
            // generation — the console fallback above still lets an admin log in.
            _logger.LogWarning(ex, "ntfy.sh push failed");
            return false;
        }
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
}
