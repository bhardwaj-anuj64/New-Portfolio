using Microsoft.AspNetCore.SignalR;

namespace Gateway.Hubs;

public interface IJobHubClient
{
    Task ReceiveJobProgress(string jobId, int percentage, string status);
}

public class JobHub : Hub<IJobHubClient>
{
    public Task JoinJobGroup(string jobId) => Groups.AddToGroupAsync(Context.ConnectionId, jobId);
}
