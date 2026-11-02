# Game Center (NFL weekly schedule → game page)

The weekly NFL schedule under the top carousel opens a full game page instead of flipping cards.

Files: `scripts/game-center.js` (the page, the week switcher), `scripts/game-fantasy.js` (fantasy points per play),
`styles/game-center.css`. `scripts/prepare-site.mjs` inlines both scripts after `hj-manager-draft-avatars` and links the
stylesheet. index.html is not edited.

## Week switcher
`‹ Week N ›` and **This week** sit beside the schedule title. Other weeks load from the league-year NFL schedule and
render with the same cards. Live score updates only redraw the current week. `hjGameCenter.setWeek(n)` switches in code.

## The game page
Same frame as the player and manager profiles: header board, a sticky section menu that tracks scrolling, and sections.

Before kickoff: Depth charts (the same panels and projections as before), Matchup predictor, Season leaders,
Odds & game environment (spread, total, moneyline with opening lines, implied points, venue, field, kickoff, weather,
scoring environment, game script), Injury report, Schedules (last five games, **Show full schedule** for every week
including the bye and upcoming games, with each game's top passer, rusher and receiver).

Live and final: Gamecast (linescore, ball and down, last play with fantasy points, fantasy leaders), Play by play
(Scoring plays / All plays by drive, newest first; no key plays), Box score (fantasy points table for players who played,
then every stat table with avatars, owners and FPTS), Team stats, Win probability (chance and the game chart, home on
top), Game leaders, then the pregame sections. Live games refresh every 15 seconds (every minute in the 45 minutes
before kickoff); open drives, the chosen tabs and scroll position survive each refresh.

Every fantasy-relevant player has an avatar, opens his profile on top of the game (Escape or × returns to the game),
and shows his owner or FA. Players who are not fantasy-relevant appear by name only. Nothing on the page names or links
to an outside site: tooltips written by shared helpers are reworded while the page is open.

## Fantasy points per play
`hjGameFantasy.playPoints(play, ctx)` scores one play in the league's scoring (read from the synced league settings,
with a built-in copy as a fallback): yards, receptions (TE 1.5), TDs, 2-pt tries, interceptions, fumbles lost, kicking
by distance, PATs, and D/ST sacks, takeaways, safeties, blocked kicks and return TDs. Yards are read from the play text
(penalty yards are not credited; a spot foul inside a gain limits the gain to the spot).
Checked against the league's official week 8 totals: 544 of 556 player-games exact; the rest within 0.3 except two
players on one lateral/double-fumble play. Points-allowed and yards-allowed D/ST tiers are game totals, not plays;
the box score always shows each player's official league total.
