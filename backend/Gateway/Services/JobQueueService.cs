using System.Collections.Concurrent;
using System.Numerics;
using Gateway.Hubs;
using Gateway.Models;
using Microsoft.AspNetCore.SignalR;

namespace Gateway.Services;

// ponytail: logs-and-dispatches mock queue; swap for a Redis/RabbitMQ-backed IJobQueueService
// implementation once a worker container consumes these jobs instead of an in-process Task.
public class JobQueueService(ILogger<JobQueueService> logger, IHubContext<JobHub, IJobHubClient> hub) : IJobQueueService
{
    private const string StlJobType = "stl-generation";
    private readonly ConcurrentDictionary<string, byte[]> _results = new();

    public Task<string> EnqueueAsync(string jobType, object payload, CancellationToken cancellationToken = default)
    {
        var jobId = Guid.NewGuid().ToString("N");
        logger.LogInformation(
            "Dispatched job {JobId} of type {JobType} with payload {@Payload}",
            jobId,
            jobType,
            payload);

        if (jobType == StlJobType)
        {
            var gridResolution = payload is StlJobRequest request ? request.GridResolution : 24;
            _ = RunStlJobAsync(jobId, gridResolution, cancellationToken);
        }

        return Task.FromResult(jobId);
    }

    public bool TryGetResult(string jobId, out byte[] result) => _results.TryGetValue(jobId, out result!);

    private async Task RunStlJobAsync(string jobId, int gridResolution, CancellationToken cancellationToken)
    {
        try
        {
            var client = hub.Clients.Group(jobId);

            await ReportProgress(client, jobId, 20, "Analyzing depth map", cancellationToken);
            await ReportProgress(client, jobId, 50, "Generating mesh", cancellationToken);
            await ReportProgress(client, jobId, 80, "Optimizing geometry", cancellationToken);

            _results[jobId] = GenerateMockStl(jobId, gridResolution);

            await ReportProgress(client, jobId, 100, "Complete", cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "STL job {JobId} failed", jobId);
        }
    }

    private static async Task ReportProgress(
        IJobHubClient client,
        string jobId,
        int percentage,
        string status,
        CancellationToken cancellationToken)
    {
        await Task.Delay(600, cancellationToken);
        await client.ReceiveJobProgress(jobId, percentage, status);
    }

    // ponytail: procedural heightmap standing in for real image/depth-map interpretation —
    // swap in an actual image-processing pipeline once one is scoped.
    private static byte[] GenerateMockStl(string seed, int gridResolution)
    {
        var resolution = Math.Clamp(gridResolution, 4, 48);
        var rng = new Random(seed.GetHashCode());
        var freqX = 0.6 + rng.NextDouble() * 0.6;
        var freqZ = 0.6 + rng.NextDouble() * 0.6;
        var amplitude = 1.0 + rng.NextDouble();
        const double span = 10.0;

        double Height(double x, double z) => Math.Sin(x * freqX) * Math.Cos(z * freqZ) * amplitude;

        var points = new Vector3[resolution + 1, resolution + 1];
        for (var i = 0; i <= resolution; i++)
        {
            for (var j = 0; j <= resolution; j++)
            {
                var x = (i / (double)resolution - 0.5) * span;
                var z = (j / (double)resolution - 0.5) * span;
                points[i, j] = new Vector3((float)x, (float)Height(x, z), (float)z);
            }
        }

        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);

        writer.Write(new byte[80]);
        writer.Write((uint)(resolution * resolution * 2));

        for (var i = 0; i < resolution; i++)
        {
            for (var j = 0; j < resolution; j++)
            {
                var a = points[i, j];
                var b = points[i + 1, j];
                var c = points[i + 1, j + 1];
                var d = points[i, j + 1];

                WriteTriangle(writer, a, b, c);
                WriteTriangle(writer, a, c, d);
            }
        }

        writer.Flush();
        return stream.ToArray();
    }

    private static void WriteTriangle(BinaryWriter writer, Vector3 a, Vector3 b, Vector3 c)
    {
        var normal = Vector3.Normalize(Vector3.Cross(b - a, c - a));
        if (float.IsNaN(normal.X) || float.IsNaN(normal.Y) || float.IsNaN(normal.Z))
        {
            normal = Vector3.UnitY;
        }

        WriteVector(writer, normal);
        WriteVector(writer, a);
        WriteVector(writer, b);
        WriteVector(writer, c);
        writer.Write((ushort)0);
    }

    private static void WriteVector(BinaryWriter writer, Vector3 v)
    {
        writer.Write(v.X);
        writer.Write(v.Y);
        writer.Write(v.Z);
    }
}
