# Trade Desk

A third view in League HQ → Roster Strength, beside Dashboard and Compare.
Market Value drives the numbers; everything the better public trade tools add
on top — starting-lineup impact, positional need, injuries, usage, schedule,
risk and a letter grade — is written up underneath it, from both managers'
point of view.

## Builder

Pick the two managers, then tap players from either roster to build the deal.
Each roster is grouped by position — QB, RB, WR, TE, K, D/ST — best first inside
each group. Multi-player packages work in both directions. Side A is blue and
side B is gold throughout, matching the split bar, so the two "sends away"
windows, the impact panels and the breakdown never read as the same colour.

The verdict band reports the value each side sends, the gap between them as a
percentage, and a needle running from "more to B" to "more to A". Bands are
Balanced (under 4%), Slight tilt (under 10%), Clear tilt (under 22%) and Wide
gap beyond that. The language is deliberately neutral — the write-up decides
whether the tilt is justified.

Each side then gets a **grade**, **roster value** before and after with league
rank, the **starting lineup** projection before and after, and **position bars**
for QB, RB, WR and TE only. Grey is what the manager holds today; green extends
it where the deal adds, red is what is left where the deal takes away with the
departing part in grey. Each bar carries that position's rank across the ten
rosters, before and after. Under the Starters scope the flex starter counts
toward his own position.

A **Watch out** strip flags a side left unable to fill a starting spot, roster
spots taken on in an uneven deal, players on injured reserve, and one side
receiving the best player in a two-for-one.

## Trade analysis

A written analysis of the whole deal, in the shape of the public AI trade
analysers but from both managers' perspective, built only from data this
league already holds. A line is omitted when its data is missing rather than
guessed, and the write-up says plainly which inputs are not in the feeds
(route participation, first-read share, red-zone splits, offensive-line
grades, coaching changes).

| Section | What it reads |
| --- | --- |
| Summary | who sends what, the market gap in neutral terms, what the deal does to each starting lineup, each manager's record, seed and playoff odds |
| Breakdown | a card per player: market value and positional rank with the 30-day move, season points and PPG, points rank at the position, role (snap %, carry share, target share, air yards), rest-of-season projection, PFF grade, injury status |
| Is it a good value? | the raw market gap; the same packages measured above the best free agent at each position (value over replacement), so a two-for-one's second piece is judged against the wire; the best player in the deal; 30-day market form; tier spread; a one-tap balancing piece |
| Injury ecosystem | designations on anyone in the deal; a player holding a share that belongs to an injured teammate in the same backfield or receiver room, with both players' shares; a pass catcher whose quarterback is out; a manager taking a player at a spot where he already has an IR player due back, or sending one and leaving that spot thin until an IR return |
| Usage and opportunity | per player: snaps, carry share and carries a game (RB), target share, targets a game, air-yard share and WOPR (WR/TE), attempts and carries (QB); points per opportunity against the position's league median; touchdown share of points; the last three weeks against the season, with the week-by-week series |
| Situational changes | mid-season team changes and starting-quarterback changes, both read from who actually played each week |
| Schedule and playoff leverage | for every player: bye week, remaining strength of schedule for his position (opponents' points allowed, ranked across the league), and the opponent in each of this league's playoff weeks (15 and 16) with how generous that defence has been; byes shared between acquired players or with the starters already at that spot; each manager's own remaining fantasy schedule |
| Positional arbitration | each unit's league rank before and after; whether the deal touches the roster's thinnest spot; roster spots freed or needed; the steepest positional cliff in the league |
| Risk profile | per acquired player: PPG, floor, ceiling, steady / up-and-down / boom-or-bust, weeks as a top-10 (RB/WR) or top-5 (QB/TE) finish and weeks outside the startable range; each manager's weekly volatility; whether that shape fits the record (contenders want floor and depth, teams playing it out want ceiling) |
| Is this a good move? | reasons for each manager to accept and to decline: value, lineup, this week vs rest of season, unit gains and losses, league rank, consolidation, roster minimums only where the deal thinned a spot, luck-adjusted record, run-in difficulty, bench waste, market form, PFF against market rank, wire alternatives, playoff-week schedule, role growing or shrinking |
| Why each side does this | each manager's motivation reverse-engineered: premium for lineup points, banking surplus, consolidation or depth, season posture, players being sold near the top or bought after a dip |
| The read | the shape of the deal, who is ahead on value and whether the other side buys it back in points, the one thing each manager has to be comfortable with, whether it fits each team's season, both grades, and how likely each manager is to accept |

A compact **factor scorecard** follows, each row leaning toward the manager the
factor favours: market value, this week, rest of season, positional fit,
opportunity trend, above the wire, market form and play quality (PFF).

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
* Injuries: ESPN `injuryStatus` on league rosters; IR slot 21.
* PFF: `hjPffEntryGrade`.

Files: `scripts/trade-desk.js`, `styles/trade-desk.css`; injected by
`scripts/prepare-site.mjs` after `hj-player-value`.
