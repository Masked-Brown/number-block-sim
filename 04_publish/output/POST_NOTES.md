# POST_NOTES.md -- three replacement sentences for the locked post, and the first-comment numbers

1. Title: "hundreds of thousands of AI simulations" is not supported by the record; the verified count is 78,103.
   Replace with: **"I found a number game on holiday, so I ran 78,000 AI simulations to find the optimal way to play it"**
2. and 3. The Phase 3 bullet's "up to trained weights" (the champion is trained weights plus depth-3 lookahead, and lookahead was the discovery) and "hundreds of games per contender" (it is exactly 500).
   Replace the bullet with: **"Phase 3, Train - a simulation harness driving the same engine, and a ladder of AI agents from random baseline up to trained weights plus depth-3 lookahead, 500 games per contender on the same fixed 500 seeds."**

First-comment numbers (all leak-free rows, register F001/F007/F008): 78,103 simulated games; champion median 634,826 over 500 fixed games, 5.56x the hand-built baseline, best game 4,062,920 with a 131,072 tile. Two breeding campaigns improved judgement 1.79x combined; lookahead at identical weights was worth 2.10x, then 1.48x more at depth 3. The honest headline: most of the AI's edge is survival, not scoring rate; 5.56x at game end shrinks to 1.66x at equal blocks. And my own practised game (121,496 in 256 blocks) scores at the searching agents' rate over those blocks; what the AI does that I could not is stay alive.
