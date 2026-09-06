namespace Gateway.Models;

public record ChallengeResponse(string ChallengeId, string Prompt, DateTimeOffset ExpiresAt);

public record VerifyRequest(string ChallengeId, int Answer);

public record VerifyResponse(bool Success, string? Token, DateTimeOffset? ExpiresAt);
