using Gateway.Models;

namespace Gateway.Services;

public interface IMathPuzzleService
{
    ChallengeResponse CreateChallenge();

    /// <summary>Validates the answer against the stored challenge. Each challengeId can be verified at most once.</summary>
    bool Verify(string challengeId, int answer);
}
