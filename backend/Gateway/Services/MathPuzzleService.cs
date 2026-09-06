using System.Collections.Concurrent;
using Gateway.Models;

namespace Gateway.Services;

public class MathPuzzleService : IMathPuzzleService
{
    private static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(2);

    private static readonly (string Symbol, Func<int, int, int> Apply)[] Operators =
    [
        ("+", (a, b) => a + b),
        ("-", (a, b) => a - b),
        ("*", (a, b) => a * b),
    ];

    private readonly ConcurrentDictionary<string, (int Answer, DateTimeOffset ExpiresAt)> _challenges = new();

    public ChallengeResponse CreateChallenge()
    {
        EvictExpired();

        var a = Random.Shared.Next(2, 20);
        var b = Random.Shared.Next(2, 12);
        var op = Operators[Random.Shared.Next(Operators.Length)];
        var hexOperand = Random.Shared.Next(0, 256);
        var hexAdds = Random.Shared.Next(2) == 0;

        var baseValue = op.Apply(a, b);
        var answer = hexAdds ? baseValue + hexOperand : baseValue - hexOperand;
        var prompt = $"({a} {op.Symbol} {b}) {(hexAdds ? "+" : "-")} 0x{hexOperand:X2}";

        var challengeId = Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.Add(ChallengeLifetime);
        _challenges[challengeId] = (answer, expiresAt);

        return new ChallengeResponse(challengeId, prompt, expiresAt);
    }

    public bool Verify(string challengeId, int answer)
    {
        // Single-use: remove on first check whether or not it succeeds, so a leaked
        // challengeId can't be brute-forced with repeated verify attempts.
        if (!_challenges.TryRemove(challengeId, out var entry))
        {
            return false;
        }

        return DateTimeOffset.UtcNow <= entry.ExpiresAt && entry.Answer == answer;
    }

    private void EvictExpired()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var (key, value) in _challenges)
        {
            if (value.ExpiresAt < now)
            {
                _challenges.TryRemove(key, out _);
            }
        }
    }
}
