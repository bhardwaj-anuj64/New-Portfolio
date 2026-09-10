namespace Gateway.Models;

public record HealthResponse(string Status, double UptimeSeconds, double MemoryUsageMb);

public record TelemetryResponse(
    double CpuUsagePercent,
    double MemoryUsageMb,
    int ActiveServices,
    DateTimeOffset Timestamp);

/// <summary>One entry from the Docker Engine API's container list. `State` is Docker's raw
/// machine-readable status (running/exited/restarting/...); `Status` is its human string
/// ("Up 3 hours", "Exited (0) 2 minutes ago").</summary>
public record ContainerStatus(string Name, string State, string Status);
