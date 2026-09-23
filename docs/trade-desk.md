# Trade Desk

A third view in League HQ → Roster Strength, beside Dashboard and Compare.
Market Value drives the numbers; everything the better public trade tools add
on top — starting-lineup impact, positional need, injuries, usage, schedule,
risk and a letter grade — is written up underneath it, from both managers'
point of view.

## Builder

Pick the two managers, then tap players from either roster to build the deal.
Each roster is grouped by position — QB, RB, WR, TE, K, D/ST — best first inside
each group, and each group header carries that position's rank across the ten
rosters (market value for QB/RB/WR/TE, projections for K and D/ST). Multi-player
packages work in both directions. Side A is blue and side B is gold throughout,
matching the split bar. On a phone the two rosters sit side by side; nothing
is clipped or truncated — names and labels wrap onto extra lines — and every
player and manager avatar stays.

The verdict band reports the value each side sends, the gap between them as a
percentage, and a needle running from "more to B" to "more to A". Bands are
Balanced (under 4%), Slight tilt (under 10%), Clear tilt (under 22%) and Wide
gap beyond that. The language is deliberately neutral — the write-up decides
whether the tilt is justified.

Each side then gets a **grade**, **roster value** before and after with league
rank, the **starting lineup** projection before and after, and **position bars**
for QB, RB, WR and TE only. Grey is what the manager holds today; green is what
the trade adds; red is what is left after the trade, with the traded-away part
hatched. Each bar carries that position's rank across the ten rosters, before
and after. Under the Starters scope the flex starter counts toward his own
position.

**Balance it** follows whenever one side is ahead on market value: several
routes to close the gap — the side ahead adding one player, or two cheaper
ones, or the side behind keeping one of the pieces it was sending — each with
the resulting gap and a one-tap button.

## Trade analysis

A written analysis of the whole deal, in the shape of the public AI trade
analysers but from both managers' perspective. It reads this league's own
data plus player news and NFL injury reports: Rotowire blurbs and their Spin
analysis through ESPN's fantasy news feed, and ESPN's team injury report
(status, injury type, expected return date), for every player in the deal and
for the teammates whose health decides his role — the same room, his
quarterback, the other pass catchers. A line or a whole section is omitted
when there is nothing to say; the write-up never reports a lack of data.

| Section | What it reads |
| --- | --- |
| Summary | who sends what, the market gap in neutral terms, what the deal does to each starting lineup, each manager's record, seed and playoff odds, and the one piece of context that most changes each player's value |
| Breakdown | a card per player: market value and positional rank with the 30-day move, season points and PPG, points rank at the position, role (snap %, carry share, target share, air yards), ESPN and Vegas rest-of-season projections, PFF grade, bye, injury status with the injury type |
| Factor scorecard | straight after the breakdown: market value, this week, rest of season, ESPN projections, Vegas projections, positional fit, opportunity trend, injury ecosystem, playoff schedule, above the wire, play quality (PFF) |
| Is it a good value? | the raw market gap; the same packages measured above the best free agent at each position (value over replacement), so a two-for-one's second piece is judged against the wire; the best player in the deal; 30-day market form; tier spread; a one-tap balancing piece |
| Injury ecosystem | grouped per player: his own designation, injury type and expected return, the latest injury blurb and its Spin, games he has missed; then every relevant teammate who is hurt, on IR, missing games or in the injury news — status, injury, expected return, weeks missed, the blurb — with the player's numbers in the games that teammate played against the games he sat out (carry share, target share, snaps, PPG), and a plain statement of which manager is buying the window and which is selling it; a pass catcher whose quarterback is out; a manager taking a player at a spot where he already has an IR player due back, or sending one and leaving that spot thin |
| Usage and opportunity | per player: snaps, carry share and carries a game (RB), target share, targets a game, air-yard share and WOPR (WR/TE), attempts and carries (QB); points per opportunity against the position's league median; touchdown share of points; the last three weeks against the season with the week-by-week series, and the reason when a jump lines up with a teammate's absence |
| Situational changes | mid-season team changes and starting-quarterback changes read from who actually played each week; role, depth-chart, trade, coaching and play-caller news for the players in the deal and their quarterbacks |
| Schedule and playoff leverage | for every player: bye week, games left, remaining strength of schedule for his position (opponents' points allowed per game, ranked across the league), and each of this league's playoff weeks (15 and 16): opponent, home or away, how many points that defence allows to the position and whether it has been more or less generous lately, indoors or outdoors, favoured or underdog where a line is posted, and the playoff-draw rank; byes shared between acquired players or with the starters already at that spot; each manager's own remaining fantasy schedule and playoff odds |
| Positional arbitration | each unit's league rank before and after; whether the deal touches the roster's thinnest spot; roster spots freed or needed; the steepest positional cliff in the league |
| Is this a good move? | reasons for each manager to accept and to decline: lineup, this week vs rest of season, unit gains and losses, league rank, consolidation, roster minimums only where the deal thinned a spot, luck-adjusted record, run-in difficulty, bench waste, a room-mate out (and when he is back), a quarterback out, targets freed up, Vegas against ESPN, market form, PFF against market rank, wire alternatives, rest-of-season and playoff-week schedule, role growing or shrinking, and market value once |
| Why each side does this | one sentence per player each manager gets or gives: ESPN and Vegas rest-of-season projections, PPG so far, the teammate injuries and news behind his role, quarterback changes, playoff draw; then the lineup effect, roster shape, season posture, and market value once |
| The read | the biggest swing in the deal (a role that exists because a teammate is out, with the expected return and whether it lands before the playoffs; a changed quarterback; a player being bought while hurt); ESPN and Vegas projections of the two packages and the playoff draws; the usage reads; whether it fits each team's season; both grades, how likely each manager is to accept, and the balancing piece |

## Finder

Scans every one-for-one and two-for-one between the asking roster and either
one chosen manager or the whole league, keeps only deals within 22% on market
value that lift the asking side's starting lineup without breaking either
roster, and surfaces deals that help both teams first. Open loads the deal into
the builder.

## Data

* Market values: `data/player-values.json` via `HJMV` (`scripts/player-value.js`).
* Projections: `hj6Projection` (ESPN + Vegas blend), season and week horizons.
* Weekly stats and snap counts: `pcLoadSeason` / `pcLoadSnaps` (nflverse rows
  merged with ESPN actuals) — usage, points, weekly ranks, floor and ceiling,
  team quarterback by week, defence-vs-position.
* NFL schedule: `pcLoadSchedules` — byes, remaining games, playoff-week opponents.
* Standings: `buildStandingsAnalytics` — record, seed, playoff odds, luck, bench
  gap, volatility, remaining schedule rank.
* Injuries: ESPN `injuryStatus` on league rosters; IR slot 21; ESPN team injury
  reports (`/teams/{id}/injuries`) for the NFL clubs in the deal.
* News: ESPN fantasy news feed (`/news/players?playerId=…`, Rotowire blurbs and
  Spin), batched for the players in the deal and their teammates, plus the
  site's own news rail; NFL rosters with depth from `ffnRosterByTeam`.
* PFF: `hjPffEntryGrade`.

Files: `scripts/trade-desk.js`, `styles/trade-desk.css`; injected by
`scripts/prepare-site.mjs` after `hj-player-value`.
