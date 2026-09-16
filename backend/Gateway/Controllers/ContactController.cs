using System.Text.RegularExpressions;
using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController(EmailService emailService, ILogger<ContactController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit(ContactRequest request, CancellationToken cancellationToken)
    {
        // Bots fill every field, including the honeypot — pretend success without logging it.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return Ok(new ContactResponse(true, "Message received."));
        }

        var name = Sanitize(request.Name);
        var message = Sanitize(request.Message);

        logger.LogInformation(
            "Contact form submission from {Email} ({Name}): {MessageLength} chars",
            request.Email,
            name,
            message.Length);

        await emailService.SendContactMessageAsync(name, request.Email, message, cancellationToken);

        return Ok(new ContactResponse(true, "Message received."));
    }

    private static string Sanitize(string input) => Regex.Replace(input.Trim(), "<[^>]*>", string.Empty);
}
