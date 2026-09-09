namespace Gateway.Models;

public record OtpChallengeResponse(string ChallengeId, DateTimeOffset ExpiresAt, string DeliveryMethod);

public record OtpVerifyRequest(string ChallengeId, string Code);

public record PushSubscriptionRequest(string Endpoint, string P256dh, string Auth);
