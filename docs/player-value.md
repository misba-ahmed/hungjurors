# Market Value

A consensus price for every fantasy player, shown across the site as **Market Value**.
The figure is a market price, not a projection: it is what managers in real leagues
actually pay for a player in completed trades.

Every number on the site is priced for one fixed format so the figures are always
comparable: **redraft, 10 teams, one quarterback, full PPR, tight-end premium**.
Kickers and team defenses are not priced and show no Market Value anywhere.

The site never names the upstream service. The `i` explainer reads:

> Fantasy player value generated from 7,402,042 trades from real fantasy football
> leagues across all major platforms.

The trade count in that sentence is live: it comes from the feed, not from the page
source, and changes whenever the collector runs.

## Where it appears

| Surface | What is shown |
| --- | --- |
| Player profile card | A full-width strip under the category row: the price, a position-rank chip (`RB1`), overall rank, 30-day drift and rostered share, with the `i` explainer. |
| League HQ · Players | A fourth column on every skill-position card, with the position rank as its subtext. Tapping the column sorts the whole filtered list by Market Value. |
| League HQ · League Activity | Each add, drop and trade carries the player's price and position rank. |
| League HQ · Roster Strength | A fifth model, **Value**, ranking rosters by the market price of their players — overall and by position, with per-player prices in the expanded view. |
| League HQ · Weekly Recap | The waiver-wire block tags the best pickup and the drop that bit with their price. |

Position rank is recomputed from the published values rather than taken from the
source, so a rank never disagrees with the number printed beside it.

## Data path

`scripts/player-value.js` reads `data/player-values.json`, published by the
**Publish site and refresh PFF** workflow on its regular schedule. If that file is
missing or older than 36 hours — a fresh checkout, say, before the first refresh —
the page falls back to reading the source endpoint directly. Failures are silent:
the surfaces show `—` and retry.

The feed is:

```json
{
  "schema": 1,
  "season": 2026,
  "generatedAt": 1758600000000,
  "format": {"type":"redraft","teams":10,"quarterbacks":1,"ppr":1,"tep":"te+"},
  "trades": 7402042,
  "count": 431,
  "players": [
    {"espnId":"4429795","sleeperId":"9221","name":"Jahmyr Gibbs","pos":"RB","team":"DET",
     "value":10707,"trend30":137,"tier":1,"rostered":0.9999,"overallRank":1,"positionRank":1}
  ]
}
```

Players are matched to the site by ESPN id, falling back to a normalised
name-plus-position key. A refresh that fails keeps the previously published file in
place rather than blanking the feature.

## Roster Strength

Adding the Value model came with two related changes to that panel:

* **Vegas and Combo no longer blank a roster.** Where a sportsbook has not priced a
  player, the ESPN projection now fills the gap, so a single unpriced bench player can
  no longer leave a team without a rank or a total. ESPN on its own is untouched.
* **Every model carries a written note** under the toolbar explaining what it measures
  — ESPN, Vegas, Combo, Value and PFF.

## Files

* `scripts/player-value.js` — data module and all five surfaces.
* `styles/player-value.css` — the strip, the directory column, the note and the tags.
* `.github/workflows/refresh-pff.yml` — the `marketValues` source inside the data-refresh step.
