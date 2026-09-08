using System.Collections.Concurrent;
using System.Text.Json;
using Gateway.Models;

namespace Gateway.Services;

public class AnalyticsService : IAnalyticsService
{
    private const int MaxRecentErrors = 50;
    private const int MaxMessageLength = 500;
    private const int MaxSourceLength = 200;

    private long _pageViews;
    private long _resumeDownloads;
    private readonly ConcurrentQueue<ErrorLogEntry> _recentErrors = new();
    private readonly object _fileLock = new();
    private readonly string _statsFilePath;
    private readonly ILogger<AnalyticsService> _logger;

    private record PersistedStats(long PageViews, long ResumeDownloads, ErrorLogEntry[] RecentErrors);

    public AnalyticsService(IWebHostEnvironment env, ILogger<AnalyticsService> logger)
    {
        _logger = logger;
        _statsFilePath = Path.Combine(env.ContentRootPath, "data", "site-stats.json");
        Load();
    }

    public void RecordPageView()
    {
        Interlocked.Increment(ref _pageViews);
        Persist();
    }

    public void RecordResumeDownload()
    {
        Interlocked.Increment(ref _resumeDownloads);
        Persist();
    }

    public void RecordError(string message, string? source)
    {
        var trimmedMessage = message.Length > MaxMessageLength ? message[..MaxMessageLength] : message;
        var trimmedSource = source is { Length: > MaxSourceLength } ? source[..MaxSourceLength] : source;

        _recentErrors.Enqueue(new ErrorLogEntry(DateTimeOffset.UtcNow, trimmedMessage, trimmedSource));
        while (_recentErrors.Count > MaxRecentErrors && _recentErrors.TryDequeue(out _))
        {
        }

        Persist();
    }

    public AnalyticsStatsResponse GetStats() =>
        new(Interlocked.Read(ref _pageViews), Interlocked.Read(ref _resumeDownloads), _recentErrors.Reverse().ToArray());

    private void Load()
    {
        if (!File.Exists(_statsFilePath)) return;

        try
        {
            var json = File.ReadAllText(_statsFilePath);
            var saved = JsonSerializer.Deserialize<PersistedStats>(json);
            if (saved is null) return;

            _pageViews = saved.PageViews;
            _resumeDownloads = saved.ResumeDownloads;
            foreach (var error in saved.RecentErrors)
            {
                _recentErrors.Enqueue(error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load persisted site stats from {Path}", _statsFilePath);
        }
    }

    // Fires on every view/download/error — fine at this site's traffic volume; batch/debounce
    // if that ever stops being true.
    private void Persist()
    {
        lock (_fileLock)
        {
            try
            {
                var dir = Path.GetDirectoryName(_statsFilePath)!;
                Directory.CreateDirectory(dir);

                var snapshot = new PersistedStats(_pageViews, _resumeDownloads, _recentErrors.ToArray());
                var tempPath = _statsFilePath + ".tmp";
                File.WriteAllText(tempPath, JsonSerializer.Serialize(snapshot));
                File.Move(tempPath, _statsFilePath, overwrite: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not persist site stats to {Path}", _statsFilePath);
            }
        }
    }
}
