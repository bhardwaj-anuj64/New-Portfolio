using System.Collections.Concurrent;
using System.Text.Json;
using Gateway.Models;

namespace Gateway.Services;

public class AnalyticsService
{
    private const int MaxRecentErrors = 50;
    private const int MaxMessageLength = 500;
    private const int MaxSourceLength = 200;
    private const int MaxVisitorIdLength = 100;

    private readonly ConcurrentDictionary<string, byte> _uniqueVisitors = new();
    private long _resumeDownloads;
    private readonly ConcurrentQueue<ErrorLogEntry> _recentErrors = new();
    private readonly object _fileLock = new();
    private readonly string _statsFilePath;
    private readonly ILogger<AnalyticsService> _logger;

    private record PersistedStats(long ResumeDownloads, ErrorLogEntry[] RecentErrors, string[] VisitorIds);

    public AnalyticsService(IWebHostEnvironment env, ILogger<AnalyticsService> logger)
    {
        _logger = logger;
        _statsFilePath = Path.Combine(env.ContentRootPath, "data", "site-stats.json");
        Load();
    }

    public void RecordPageView(string? visitorId)
    {
        if (string.IsNullOrWhiteSpace(visitorId) || visitorId.Length > MaxVisitorIdLength)
        {
            return;
        }

        if (_uniqueVisitors.TryAdd(visitorId, 0))
        {
            Persist();
        }
    }

    public void RecordResumeDownload()
    {
        Interlocked.Increment(ref _resumeDownloads);
        Persist();
    }

    /// <summary>Message/source are truncated defensively — this endpoint is unauthenticated.</summary>
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
        new(_uniqueVisitors.Count, Interlocked.Read(ref _resumeDownloads), _recentErrors.Reverse().ToArray());

    private void Load()
    {
        if (!File.Exists(_statsFilePath)) return;

        try
        {
            var json = File.ReadAllText(_statsFilePath);
            var saved = JsonSerializer.Deserialize<PersistedStats>(json);
            if (saved is null) return;

            _resumeDownloads = saved.ResumeDownloads;
            foreach (var error in saved.RecentErrors)
            {
                _recentErrors.Enqueue(error);
            }
            foreach (var visitorId in saved.VisitorIds ?? [])
            {
                _uniqueVisitors.TryAdd(visitorId, 0);
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

                var snapshot = new PersistedStats(_resumeDownloads, _recentErrors.ToArray(), _uniqueVisitors.Keys.ToArray());
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
