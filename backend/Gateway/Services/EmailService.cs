using System.Net;
using System.Net.Mail;

namespace Gateway.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    /// <summary>Delivers a contact form submission — logs it as a fallback when SMTP isn't
    /// configured, and again if the send itself fails, rather than losing the message.</summary>
    public async Task SendContactMessageAsync(string name, string email, string message, CancellationToken cancellationToken)
    {
        var user = config["Smtp:User"];
        var appPassword = config["Smtp:AppPassword"];
        var to = config["Smtp:ToAddress"];

        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(appPassword) || string.IsNullOrWhiteSpace(to))
        {
            // ponytail: console-only fallback — same shape as WebPushService's OTP fallback.
            // This is the path that actually runs until real SMTP credentials are configured.
            logger.LogWarning("[CONTACT — DEV FALLBACK] From {Name} <{Email}>: {Message}", name, email, message);
            return;
        }

        using var client = new SmtpClient(config["Smtp:Host"] ?? "smtp.gmail.com", config.GetValue("Smtp:Port", 587))
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(user, appPassword),
        };

        using var mail = new MailMessage
        {
            From = new MailAddress(user, "anujb.dev contact form"),
            Subject = $"Portfolio contact: {name}",
            Body = $"{message}\n\n— {name} <{email}>",
        };
        mail.To.Add(to);
        mail.ReplyToList.Add(new MailAddress(email, name));

        try
        {
            await client.SendMailAsync(mail, cancellationToken);
        }
        catch (Exception ex)
        {
            // Don't fail the API call over an SMTP hiccup — the message is still logged.
            logger.LogWarning(ex, "Failed to email contact submission — logging instead. From {Name} <{Email}>: {Message}", name, email, message);
        }
    }
}
