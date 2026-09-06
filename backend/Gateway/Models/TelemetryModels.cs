namespace Gateway.Models;

public record HealthResponse(string Status, double UptimeSeconds, double MemoryUsageMb);

public record TelemetryResponse(
    double CpuUsagePercent,
    double MemoryUsageMb,
    int ActiveServices,
    DateTimeOffset Timestamp);
