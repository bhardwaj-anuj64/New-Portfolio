using Gateway.Models;

namespace Gateway.Services;

public interface IDockerService
{
    /// <summary>Lists containers on this host via the Docker Engine API. Returns an empty list
    /// if the Docker socket isn't reachable (e.g. local dev without it mounted) rather than
    /// throwing — this backs a status widget, not a critical path.</summary>
    Task<IReadOnlyList<ContainerStatus>> GetContainersAsync(CancellationToken cancellationToken);
}
