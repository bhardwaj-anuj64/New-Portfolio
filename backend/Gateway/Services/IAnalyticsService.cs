using Gateway.Models;

namespace Gateway.Services;

public interface IAnalyticsService
{
    void RecordPageView();

    void RecordResumeDownload();

    /// <summary>Message/source are truncated defensively — this endpoint is unauthenticated.</summary>
    void RecordError(string message, string? source);

    AnalyticsStatsResponse GetStats();
}
