using System.ComponentModel.DataAnnotations;

namespace Gateway.Models;

public record OtpChallengeResponse(string ChallengeId, DateTimeOffset ExpiresAt, string DeliveryMethod);

public record OtpVerifyRequest([Required] string ChallengeId, [Required] string Code);

public record PushSubscriptionRequest(string Endpoint, string P256dh, string Auth);

public record DeployNotifyRequest([Required] string Secret, [Required] string Message);
