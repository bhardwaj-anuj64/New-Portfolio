namespace Gateway.Models;

public record VerifyResponse(bool Success, string? Token, DateTimeOffset? ExpiresAt);
