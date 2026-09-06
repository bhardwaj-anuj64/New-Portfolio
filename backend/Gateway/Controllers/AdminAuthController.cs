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
[Route("api/admin")]
[Authorize]
public class AdminAuthController(IMathPuzzleService puzzleService, IConfiguration config) : ControllerBase
{
    [HttpPost("challenge")]
    [AllowAnonymous]
    public ActionResult<ChallengeResponse> CreateChallenge()
    {
        return Ok(puzzleService.CreateChallenge());
    }

    [HttpPost("verify")]
    [AllowAnonymous]
    public ActionResult<VerifyResponse> Verify(VerifyRequest request)
    {
        if (!puzzleService.Verify(request.ChallengeId, request.Answer))
        {
            return Unauthorized(new VerifyResponse(false, null, null));
        }

        var expiryMinutes = config.GetValue("Jwt:AdminTokenExpiryMinutes", 15);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);
        var token = IssueAdminToken(expiresAt);

        return Ok(new VerifyResponse(true, token, expiresAt));
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
