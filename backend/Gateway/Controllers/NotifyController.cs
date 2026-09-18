using System.Security.Cryptography;
using System.Text;
using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

// Shared-secret auth instead of the admin JWT flow: the caller here is the GitHub Actions deploy
// job, not a logged-in browser session — there's no OTP flow to run from CI. Reuses the same push
// channel as admin OTP delivery rather than adding a third-party notification service.
[ApiController]
[Route("api/notify")]
public class NotifyController(NtfyService ntfyService, IConfiguration config) : ControllerBase
{
    [HttpPost("deploy-failure")]
    public async Task<IActionResult> DeployFailure([FromBody] DeployNotifyRequest request, CancellationToken cancellationToken)
    {
        var expected = config["Deploy:NotifySecret"];
        if (string.IsNullOrEmpty(expected) || !SecretMatches(request.Secret, expected))
        {
            return Unauthorized();
        }

        await ntfyService.SendAsync(request.Message, cancellationToken);
        return NoContent();
    }

    private static bool SecretMatches(string provided, string expected) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(provided), Encoding.UTF8.GetBytes(expected));
}
