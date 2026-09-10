using System.Diagnostics;
using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

[ApiController]
[Route("api/system")]
public class SystemController(IDockerService dockerService) : ControllerBase
{
    // Baseline sampled at startup so the very first telemetry call already has a real
    // (if short) window instead of measuring against zero.
    private static readonly object CpuSampleLock = new();
    private static DateTime _lastSampleTime = DateTime.UtcNow;
    private static TimeSpan _lastCpuTime = Process.GetCurrentProcess().TotalProcessorTime;

    [HttpGet("health")]
    public ActionResult<HealthResponse> GetHealth()
    {
        using var process = Process.GetCurrentProcess();
        var uptime = DateTime.UtcNow - process.StartTime.ToUniversalTime();
        var memoryMb = process.WorkingSet64 / 1024d / 1024d;

        return Ok(new HealthResponse("healthy", uptime.TotalSeconds, Math.Round(memoryMb, 1)));
    }

    [HttpGet("containers")]
    public async Task<ActionResult<IReadOnlyList<ContainerStatus>>> GetContainers(CancellationToken cancellationToken)
        => Ok(await dockerService.GetContainersAsync(cancellationToken));

    [HttpGet("telemetry")]
    public async Task<ActionResult<TelemetryResponse>> GetTelemetry(CancellationToken cancellationToken)
    {
        using var process = Process.GetCurrentProcess();
        var memoryMb = process.WorkingSet64 / 1024d / 1024d;
        var cpuPercent = SampleCpuPercent(process);

        var containers = await dockerService.GetContainersAsync(cancellationToken);
        var activeServices = containers.Count(c => c.State == "running");

        return Ok(new TelemetryResponse(cpuPercent, Math.Round(memoryMb, 1), activeServices, DateTimeOffset.UtcNow));
    }

    // Real gateway-process CPU%, from the delta between two TotalProcessorTime samples —
    // no external metrics source needed for the process the Gateway can already see.
    private static double SampleCpuPercent(Process process)
    {
        lock (CpuSampleLock)
        {
            var now = DateTime.UtcNow;
            var cpuTime = process.TotalProcessorTime;
            var wallElapsedMs = (now - _lastSampleTime).TotalMilliseconds;
            var cpuElapsedMs = (cpuTime - _lastCpuTime).TotalMilliseconds;
            _lastSampleTime = now;
            _lastCpuTime = cpuTime;

            if (wallElapsedMs <= 0) return 0;
            return Math.Round(Math.Clamp(cpuElapsedMs / (Environment.ProcessorCount * wallElapsedMs) * 100, 0, 100), 1);
        }
    }
}
