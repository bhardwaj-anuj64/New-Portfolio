using System.ComponentModel.DataAnnotations;

namespace Gateway.Models;

// Validation attributes must target the primary-constructor parameters (the default when
// unqualified) rather than the generated properties — ASP.NET's record model binder validates
// against the parameters and throws if it instead finds [property:]-targeted metadata.
public record ContactRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(2000, MinimumLength = 10)] string Message,
    // Honeypot: hidden from real visitors via CSS, so a filled value means a bot submitted this.
    string? Website = null);

public record ContactResponse(bool Success, string Message);
