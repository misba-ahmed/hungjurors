# Matchup loading

The default matchup week stays on the most recently completed week through Tuesday (America/Chicago), and advances Wednesday. Explicit week selections are preserved.

Do not gate the Matchup Center behind the season-history queue. Render available pairings and scores from the league snapshot synchronously. Fetch the selected historical week directly with the shared request/history caches and deduplicate it against background loading. Load the selected/latest weeks before older weeks. Historical cards must use the chosen matchup's saved roster, never today's roster as a substitute. A late response must not reset the selected week or rerender a different selection.

Regression checks: scripts/test-matchup-week.mjs and scripts/test-matchup-history.mjs, both run before deployment. Browser verification on 2026-10-06 held historical Week 4 requests pending: all five matchup cards appeared without the empty loading message at 1440px and 390px.
