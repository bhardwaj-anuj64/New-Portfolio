using Gateway.Models;

namespace Gateway.Services;

public interface IWebPushService
{
    /// <summary>Generates a 6-digit OTP, stores it with a 60s TTL, and attempts to push it to any
    /// registered devices — falling back to a console log when none are registered or dispatch fails.</summary>
    Task<OtpChallengeResponse> GenerateOtpAsync(CancellationToken cancellationToken);

    /// <summary>Constant-time, single-use verification. Each challengeId can be checked at most once.</summary>
    bool Verify(string challengeId, string code);

    /// <summary>The server's public VAPID key, handed to the browser for PushManager.subscribe().</summary>
    string? GetVapidPublicKey();

    void Subscribe(PushSubscriptionRequest subscription);
}
