using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Yarp.ReverseProxy.Forwarder;

namespace Gateway.Controllers;

/// <summary>
/// Forwards authenticated admin requests to the Home Assistant instance, injecting the
/// long-lived HA token server-side so it never reaches the browser.
/// </summary>
[ApiController]
[Route("api/admin/homeassistant")]
[Authorize]
public class HomeAssistantProxyController : ControllerBase
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
    private readonly string? _longLivedToken;

    public HomeAssistantProxyController(IHttpForwarder forwarder, IConfiguration config)
    {
        _forwarder = forwarder;
        _destinationPrefix = config["HomeAssistant:BaseUrl"] ?? "http://homeassistant.local:8123";
        _longLivedToken = config["HomeAssistant:LongLivedToken"];
    }

    [HttpGet("{**path}")]
    public async Task<IActionResult> Forward(string path)
    {
        var error = await _forwarder.SendAsync(
            HttpContext,
            _destinationPrefix,
            ForwarderHttpClient,
            ForwarderRequestConfig.Empty,
            new HomeAssistantAuthTransformer(_longLivedToken));

        return error == ForwarderError.None
            ? new EmptyResult()
            : StatusCode(StatusCodes.Status502BadGateway, new { message = "Home Assistant is unreachable." });
    }

    private sealed class HomeAssistantAuthTransformer(string? token) : HttpTransformer
    {
        public override async ValueTask TransformRequestAsync(
            HttpContext httpContext,
            HttpRequestMessage proxyRequest,
            string destinationPrefix,
            CancellationToken cancellationToken)
        {
            await base.TransformRequestAsync(httpContext, proxyRequest, destinationPrefix, cancellationToken);

            if (!string.IsNullOrEmpty(token))
            {
                proxyRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }
        }
    }
}
