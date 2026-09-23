# Trade Desk

A third view in League HQ → Roster Strength, beside Dashboard and Compare.
Market Value is the currency; everything the better public trade tools add on
top — starting-lineup impact, positional need, depth risk, market form and a
letter grade — is layered underneath it.

## Builder

Pick the two managers, then tap players from either roster to build the deal.
Multi-player packages work in both directions.

The verdict band reports the value each side sends, the gap between them as a
percentage, and a fairness needle running from one manager winning to the other.
Bands are Even (under 4%), Slight edge (under 10%), Clear edge (under 22%) and
Lopsided beyond that.

Each side then gets:

* **Grade** — a letter from the value edge, adjusted by how much the deal moves
  that side's projected starting lineup as a share of what it was already
  scoring, so a handful of season points never outweighs the price paid.
* **Roster value** before and after, and the manager's **league rank** by roster
  market value before and after.
* **Starting lineup** projected points before and after, using the site's own
  blended ESPN + Vegas projection so the maths agrees with Roster Strength.
* **Position bars** for QB, RB, WR, TE and FLEX, drawn before against after.

Below that:

* **Balance it** — when one side is ahead, the closest player on the winning
  roster to the size of the gap, with one tap to add him.
* **Market form** — anyone in the deal whose price has moved sharply in 30 days,
  flagged as paying the new price or a possible buy-low.
* **Watch out** — a side left unable to fill a starting spot, roster spots taken
  on in an uneven deal, players on injured reserve, and consolidation (one side
  getting the best player in a two-for-one).

## Beyond the price

A scorecard of up to nine factors, each leaning toward the manager it favours,
built only from data this league already holds — no invented numbers. A factor
is omitted when its data is missing rather than guessed.

| Factor | Source |
| --- | --- |
| Market value | the published price, and the gap between packages |
| This week | Week-horizon ESPN + Vegas starters, both sides |
| Rest of season | season-horizon starters, both sides |
| Positional fit | whether the deal fixes each roster's thinnest unit |
| Depth left behind | healthy bodies per position after the deal |
| Availability risk | injury designations and anyone without a game this week |
| Market form | which side ends up holding the players the market is moving toward |
| Play quality | average PFF grade of what each side receives |
| Fits the season | playoff odds and power rating versus what the deal does |

### Usage, from the feeds the site already publishes

`pcLoadSeason` (nflverse weekly stats) and `pcLoadSnaps` (snap counts) are read
on open, so a shared room is described with the actual split rather than a
hand-wave — snap share, carry share, target share and air-yards share, over the
last three games against the season.

Carry share is computed per team-week from the same rows; everything else comes
straight from the feed (`target_share`, `air_yards_share`, `wopr`, `offense_pct`).

That powers four further reads:

* **Role growing / shrinking** — last three games against the season, on snaps,
  carries or targets. Usage moves before production does.
* **Work without points** — a starter's share at a points-per-opportunity well
  under the league median for the position, which usually closes.
* **Touchdown dependence** — the share of a player's points that came from
  touchdowns, and on how many touches.
* **Above the wire** — every incoming player measured against the best player at
  his position that nobody in the league rosters, so an upgrade is compared to
  the actual alternative.

Plus positional scarcity: how far value falls between the last starter at a
position and the next man up, across this league's ten rosters.

Then a written case for and against each manager, drawn from the same sources
plus the standings model: record against expected wins (luck), points left on
the bench, remaining strength of schedule, market trend against PFF grade
(market ahead of the tape, or the reverse), and shared backfields or receiver
rooms — including when a player's workload is inflated by a team-mate's injury.

Anything derived from the standings is suppressed until at least three games
have been played, so nothing is asserted in the preseason.

## Finder

Scans every one-for-one and two-for-one between the asking manager and either
the chosen partner or the whole league. A suggestion has to clear four bars:

1. it lifts the asking side's starting lineup by at least 0.4% of its total,
2. the two packages are within 22% on market value,
3. neither roster is left unable to field a lineup,
4. no more than two suggestions are built around the same incoming player.

Results are ranked by the asking side's gain plus the partner's gain, less the
value gap, with deals that help both teams surfaced first and tagged. Each row
shows both lineup swings and the value gap, and opens straight into the builder.

## Notes for maintenance

The page styles `header` and `section` as bare elements, so the Trade Desk uses
plain divs and declares its own padding wherever a `section` is unavoidable.

All type is 9px or larger.

Files: `scripts/trade-desk.js`, `styles/trade-desk.css`, plus three lines in
`scripts/prepare-site.mjs`.
