namespace Gateway.Models;

public record AnalyticsStatsResponse(long PageViews, long ResumeDownloads, ErrorLogEntry[] RecentErrors);

public record ErrorLogEntry(DateTimeOffset Timestamp, string Message, string? Source);

public record ClientErrorRequest(string Message, string? Source);
