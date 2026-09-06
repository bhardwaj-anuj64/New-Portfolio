using System.Diagnostics;
using Gateway.Models;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    [HttpGet("health")]
    public ActionResult<HealthResponse> GetHealth()
    {
        using var process = Process.GetCurrentProcess();
        var uptime = DateTime.UtcNow - process.StartTime.ToUniversalTime();
        var memoryMb = process.WorkingSet64 / 1024d / 1024d;

        return Ok(new HealthResponse("healthy", uptime.TotalSeconds, Math.Round(memoryMb, 1)));
    }

    [HttpGet("telemetry")]
    public ActionResult<TelemetryResponse> GetTelemetry()
    {
        using var process = Process.GetCurrentProcess();
        var memoryMb = process.WorkingSet64 / 1024d / 1024d;

        // ponytail: CPU% and active-service count are mocked until a real metrics
        // source (container stats / Docker API) backs the telemetry widget.
        var cpuPercent = Math.Round(Random.Shared.NextDouble() * 40, 1);
        const int activeServices = 4;

        return Ok(new TelemetryResponse(cpuPercent, Math.Round(memoryMb, 1), activeServices, DateTimeOffset.UtcNow));
    }
}
