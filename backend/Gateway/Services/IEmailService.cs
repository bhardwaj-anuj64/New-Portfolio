namespace Gateway.Services;

public interface IEmailService
{
    /// <summary>Delivers a contact form submission — logs it as a fallback when SMTP isn't
    /// configured, and again if the send itself fails, rather than losing the message.</summary>
    Task SendContactMessageAsync(string name, string email, string message, CancellationToken cancellationToken);
}
