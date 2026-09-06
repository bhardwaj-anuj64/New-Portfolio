namespace Gateway.Services;

/// <summary>
/// Contract for dispatching heavy async compute jobs (e.g. STL generation) to a worker.
/// The in-memory implementation is a stand-in for a future Redis/RabbitMQ-backed broker.
/// </summary>
public interface IJobQueueService
{
    Task<string> EnqueueAsync(string jobType, object payload, CancellationToken cancellationToken = default);

    /// <summary>Retrieves the completed binary result for a job, if it has finished.</summary>
    bool TryGetResult(string jobId, out byte[] result);
}
