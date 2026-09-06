using Gateway.Models;
using Gateway.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobController(IJobQueueService jobQueueService) : ControllerBase
{
    [HttpPost("stl")]
    public async Task<IActionResult> CreateStlJob(StlJobRequest request, CancellationToken cancellationToken)
    {
        var jobId = await jobQueueService.EnqueueAsync("stl-generation", request, cancellationToken);
        return Accepted(new { jobId });
    }

    [HttpGet("stl/{jobId}")]
    public IActionResult GetStlResult(string jobId)
    {
        return jobQueueService.TryGetResult(jobId, out var bytes)
            ? File(bytes, "model/stl", $"{jobId}.stl")
            : NotFound(new { message = "Job not complete or not found." });
    }
}
