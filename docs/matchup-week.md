# League HQ default matchup week

Use hjDefaultMatchupWeek for Matchups defaults only. Keep the just-played week on Monday and Tuesday when ESPN has already advanced to a new, unplayed week. Switch on Wednesday in America/Chicago. Do not decrement an active Monday week or Week 1. Explicit week selections and matchup links retain their chosen destination. Other site sections continue using hjCurrentWeek.

The default state remains matchupWeek=0 so refreshes recompute the date-dependent default. Boundary tests cover Tuesday/Wednesday in both daylight and standard time, active Monday games, missing previous schedules and Week 1. Browser integration verifies Week 4 Tuesday, Week 5 Wednesday, and explicit Week 3 selection.
