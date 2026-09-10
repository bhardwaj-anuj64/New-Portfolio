using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text.Json;
using System.Text.Json.Serialization;
using Gateway.Models;

namespace Gateway.Services;

// ponytail: reads the Docker Engine API directly over its unix socket (native
// SocketsHttpHandler.ConnectCallback) instead of pulling in Docker.DotNet for the one
// list-containers call this app needs.
public class DockerService : IDockerService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly HttpClient _http;
    private readonly ILogger<DockerService> _logger;

    public DockerService(ILogger<DockerService> logger, IConfiguration config)
    {
        _logger = logger;
        var socketPath = config["Docker:SocketPath"] ?? "/var/run/docker.sock";
        var handler = new SocketsHttpHandler
        {
            ConnectCallback = async (_, cancellationToken) =>
            {
                var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
                await socket.ConnectAsync(new UnixDomainSocketEndPoint(socketPath), cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            },
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri("http://docker"), Timeout = TimeSpan.FromSeconds(3) };
    }

    public async Task<IReadOnlyList<ContainerStatus>> GetContainersAsync(CancellationToken cancellationToken)
    {
        try
        {
            var raw = await _http.GetFromJsonAsync<List<RawContainer>>(
                "/containers/json?all=true", JsonOptions, cancellationToken);
            return raw?.Select(c => new ContainerStatus(
                (c.Names?.FirstOrDefault() ?? "unknown").TrimStart('/'),
                c.State ?? "unknown",
                c.Status ?? "")).ToList() ?? [];
        }
        catch (Exception ex) when (ex is HttpRequestException or SocketException or OperationCanceledException)
        {
            _logger.LogWarning(ex, "Docker socket unreachable — reporting no containers");
            return [];
        }
    }

    private record RawContainer(
        [property: JsonPropertyName("Names")] string[]? Names,
        [property: JsonPropertyName("State")] string? State,
        [property: JsonPropertyName("Status")] string? Status);
}
