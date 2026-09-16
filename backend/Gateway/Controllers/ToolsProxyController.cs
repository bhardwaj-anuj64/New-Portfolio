using System.Net;
using Microsoft.AspNetCore.Mvc;
using Yarp.ReverseProxy.Forwarder;

namespace Gateway.Controllers;

/// <summary>
/// Forwards requests to the Tools service (segmentation, tonal-banding, mesh generation —
/// see portfolio-microservices/tools-service), a stateless internal-only container with no
/// secrets to inject. Public since these are public demo-tool endpoints.
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
            new StripPrefixTransformer(path));

        return error == ForwarderError.None
            ? new EmptyResult()
            : StatusCode(StatusCodes.Status502BadGateway, new { message = "The tools service is unreachable." });
    }

    // HttpTransformer.Default forwards the FULL incoming request path (e.g. "/api/tools/calibrate")
    // onto destinationPrefix, but the tools service mounts its routes at the bare path ("/calibrate")
    // with no "/api/tools" prefix of its own — so the "api/tools" segment this controller matched on
    // has to be stripped before forwarding, not appended a second time.
    private sealed class StripPrefixTransformer(string path) : HttpTransformer
    {
        public override async ValueTask TransformRequestAsync(
            HttpContext httpContext,
            HttpRequestMessage proxyRequest,
            string destinationPrefix,
            CancellationToken cancellationToken)
        {
            await base.TransformRequestAsync(httpContext, proxyRequest, destinationPrefix, cancellationToken);
            proxyRequest.RequestUri = RequestUtilities.MakeDestinationAddress(
                destinationPrefix, "/" + path, httpContext.Request.QueryString);
        }
    }
}
