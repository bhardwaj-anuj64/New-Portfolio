using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Gateway.Controllers;

[ApiController]
[Route("api/admin/challenge")]
[Authorize]
public class AdminChallengeController(WebPushService pushService, IConfiguration config) : ControllerBase
{
    [HttpPost("generate")]
    [AllowAnonymous]
    public async Task<ActionResult<OtpChallengeResponse>> Generate(CancellationToken cancellationToken)
    {
        return Ok(await pushService.GenerateOtpAsync(cancellationToken));
    }

    [HttpPost("verify")]
    [AllowAnonymous]
    public ActionResult<VerifyResponse> Verify(OtpVerifyRequest request)
    {
        if (!pushService.Verify(request.ChallengeId, request.Code))
        {
            return Unauthorized(new VerifyResponse(false, null, null));
        }

        var expiryMinutes = config.GetValue("Jwt:AdminTokenExpiryMinutes", 15);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);
        var token = IssueAdminToken(expiresAt);

        return Ok(new VerifyResponse(true, token, expiresAt));
    }

    // Public: the VAPID public key is, by design, safe to hand to any browser that asks.
    [HttpGet("vapid-public-key")]
    [AllowAnonymous]
    public ActionResult<object> GetVapidPublicKey()
    {
        var key = pushService.GetVapidPublicKey();
        return string.IsNullOrWhiteSpace(key) ? NotFound() : Ok(new { publicKey = key });
    }

    // Deliberately NOT [AllowAnonymous]: only an already-authenticated admin session may enroll a
    // device for future push OTPs, so knowing the #admin URL alone can't hijack future logins.
    [HttpPost("subscribe")]
    public IActionResult Subscribe(PushSubscriptionRequest request)
    {
        pushService.Subscribe(request);
        return Ok();
    }

    private string IssueAdminToken(DateTimeOffset expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: [new Claim(ClaimTypes.Role, "admin")],
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
