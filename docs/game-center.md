# Game Center (NFL weekly schedule → game page)

The weekly NFL schedule under the top carousel opens a full game page instead of flipping cards.

Files: `scripts/game-center.js` (the page, the week switcher), `scripts/game-fantasy.js` (fantasy points per play),
`styles/game-center.css`. `scripts/prepare-site.mjs` inlines both scripts after `hj-manager-draft-avatars` and links the
stylesheet. index.html is not edited.

## Card order
Like ESPN's scoreboard: games in progress first, then upcoming, then finished; by kickoff within each group, and ESPN's
own order between games at the same kickoff. A card moves when its game's status changes (kickoff, final) without
moving the rail's scroll position. A past week (all final) and a future week (all upcoming) read in kickoff order.

## Week switcher
`‹ Week N ›` and **This week** sit beside the schedule title. Other weeks load from the league-year NFL schedule and
render with the same cards. Live score updates only redraw the current week. `hjGameCenter.setWeek(n)` switches in code.

## The game page
Same frame as the player and manager profiles: header board, a sticky section menu that tracks scrolling, and sections.

Before kickoff: Depth charts (both teams across from each other, QB, RB1… down the middle, same projections and
E/V toggle as before; a player ruled out — O, IR, PUP, NFI, suspended, inactive, by the same statuses as the site's
badges — gives up his slot to the next player in the team's order and is listed in an OUT row under the chart;
questionable and doubtful players keep their slot; refreshed every 5 minutes while the page is open; statuses are
today's, so this applies only to this week's games before and during the game — a finished game or another week's
shows the depth feed's order, labelled "Today's depth chart"), Matchup predictor, Season leaders, Odds (spread, total and moneyline cards
with prices, opening lines and movement, a scoring-band gauge for the total, each side's chance to win from the
moneylines, implied team totals), Game environment (its own section and menu item, Nov 5; each card draws the
information: kickoff day strip and time-of-day bar with the countdown; a stadium drawing with roof, grass or turf and
the home team's end zones; weather as a temperature scale, a 0-30 mph wind dial with gusts, a rain drop filled to
the chance of rain and the four game hours one by one (Open-Meteo, located from the stadium's city); weather impact
meters for passing and kicking; this game's total among the week's games as a dot plot with the week's average;
projected margin and win-chance bar; rest days as day blocks; home and road results game by game; against-the-spread
bars; attendance), Injury report, Schedules (last five games, **Show full schedule** for every
week including the bye; the top passer, rusher and receiver of each game with his league points, colored against his
projection for that week, and his manager).

Live and final: Gamecast (linescore, ball and down, last play with fantasy points, fantasy leaders), Play by play
(Scoring plays / All plays by drive, newest first; no key plays), Box score (team switch stays at the top while
scrolling the box score; FPTS is the first column in passing, rushing, receiving and kicking, colored against the
projection with the projection in italics beneath; position and owner line under each name; the D/ST row leads the defense table; tackles and the other
non-fantasy tables list names only), Team stats, Win probability (chance and the game chart, home on
top), Game leaders, then the pregame sections. Live games refresh every 15 seconds (every minute in the 45 minutes
before kickoff); open drives, the chosen tabs and scroll position survive each refresh.

The injury report also lists players hurt in the game, in two groups:
- Injured during a play: from the play-by-play note ("BLT-L.Jackson was injured during the play"; the play text uses
  its own team codes such as BLT, CLV, HST, ARZ). The note has a short name only, no player id: it is resolved to
  an id once (among the players on that play, whose ids the play data carries; else that team's roster) and the id is
  used from then on. Returned = the "has returned to the game" update or his next play,
  matched by player id, never by name text. "Did not return" only for a player seen in the play data before he was
  hurt; otherwise "No return noted" (linemen rarely appear in the play data).
- Injury reported after kickoff: players who took part in the game and whose injury report was updated after kickoff
  (within two days), with their last play; e.g. a quarterback who left without an injury note in the play text. Managers are shown everywhere a fantasy player appears: the usual manager avatar and name, or FA (play chips show
nothing for a free agent; the depth charts use the same owner line); the schedule's leader cells use the depth-chart style (name only) to keep the row height. Players are matched by ESPN player id throughout, including ownership (no name fallback). Every fantasy-relevant player has an avatar, opens his profile on top of the game (Escape or × returns to the game),
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

## Site functions this file replaces (edit them here, not in index.html)
`scripts/game-center.js` loads after the site's own scripts and replaces three schedule-rail functions:
`renderNFLWeekSchedule` (renders the shown week and the week switcher), `nflCardHTML` (front face only, opens the game
page) and `nflUpdateScoreCard` (skipped while another week is shown). A change to those functions in index.html has
no effect on the live site. Nothing else is replaced. The depth charts use `fetchTeamDepth` as it is; to fill the
slot of a ruled-out player they fetch the same depth feed again and pass it to the site's own `normalizeDepth` with
that player taken out, so the site's ordering rules decide who is next. If that feed does not reproduce the site's
rows exactly (by player id), the site's rows are shown unchanged. The card-gesture test
(`scripts/test-card-gestures.mjs`) checks that pulling the game page's header closes it.

Memory and requests: a game's summary and play-by-play are dropped from memory when its page closes. League points for
schedule leaders are shared across games (past weeks are kept; the current week refreshes after 5 minutes).
