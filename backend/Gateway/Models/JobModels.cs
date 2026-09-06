namespace Gateway.Models;

/// <summary>Image or depth-map payload submitted for mesh generation. The mesh pipeline is a
/// procedural mock (see JobQueueService) — the image data isn't decoded server-side yet.</summary>
public record StlJobRequest(string ImageData, int GridResolution = 24);
