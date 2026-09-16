using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController(AnalyticsService analytics) : ControllerBase
{
    [HttpPost("pageview")]
    [AllowAnonymous]
    public IActionResult RecordPageView([FromBody] PageViewRequest? request)
    {
        analytics.RecordPageView(request?.VisitorId);
        return NoContent();
    }

    [HttpPost("resume-download")]
    [AllowAnonymous]
    public IActionResult RecordResumeDownload()
    {
        analytics.RecordResumeDownload();
        return NoContent();
    }

    [HttpPost("error")]
    [AllowAnonymous]
    public IActionResult RecordError(ClientErrorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest();
        }

        analytics.RecordError(request.Message, request.Source);
        return NoContent();
    }

    [HttpGet("stats")]
    public ActionResult<AnalyticsStatsResponse> GetStats() => Ok(analytics.GetStats());
}
