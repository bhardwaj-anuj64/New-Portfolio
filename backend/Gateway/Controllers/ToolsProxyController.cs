using System.Net;
using Microsoft.AspNetCore.Mvc;
using Yarp.ReverseProxy.Forwarder;

namespace Gateway.Controllers;

/// <summary>
/// Forwards requests to the Tools service (segmentation, tonal-banding, mesh generation —
/// see portfolio-microservices/tools-service), a stateless internal-only container with no
/// secrets to inject. Public, unlike the Home Assistant proxy, since these are public demo-tool
/// endpoints (matching JobController).
/// </summary>
[ApiController]
[Route("api/tools")]
public class ToolsProxyController : ControllerBase
{
    private static readonly HttpMessageInvoker ForwarderHttpClient = new(new SocketsHttpHandler
    {
        UseProxy = false,
        AllowAutoRedirect = false,
        AutomaticDecompression = DecompressionMethods.None,
        UseCookies = false,
    });

    private readonly IHttpForwarder _forwarder;
    private readonly string _destinationPrefix;

    public ToolsProxyController(IHttpForwarder forwarder, IConfiguration config)
    {
        _forwarder = forwarder;
        _destinationPrefix = config["Tools:BaseUrl"] ?? "http://localhost:8000";
    }

    [HttpGet("{**path}")]
    [HttpPost("{**path}")]
    public async Task<IActionResult> Forward(string path)
    {
        var error = await _forwarder.SendAsync(
            HttpContext,
            _destinationPrefix,
            ForwarderHttpClient,
            ForwarderRequestConfig.Empty,
            HttpTransformer.Default);

        return error == ForwarderError.None
            ? new EmptyResult()
            : StatusCode(StatusCodes.Status502BadGateway, new { message = "The tools service is unreachable." });
    }
}
