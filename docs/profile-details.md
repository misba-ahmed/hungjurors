# Profile and challenge detail rules

Approved October 13, 2026:
- Keep the navy-and-gold waiver card; omit its redundant red Waivers badge.
- All side-challenge graphics share one zoom button: plus in fitted mode, minus in detail mode. Clicks and double taps update the same state and icon.
- Perfect Lineup award details use the full side-challenges description.
- Official Season Awards in profiles open the matching year, winner and award card, including the week for repeat prizes.
- Player-add charts show newest seasons first in a single horizontal row; never wrap bars outside the card.
- Career High means the highest completed individual week across the entire career, including regular season and all postseason games. Show the season year and week underneath. Never count a multi-week aggregate as a weekly high. Load archived weekly scores to supplement historical summaries and preserve the largest known result during loading.
- Restore the original card lifecycle; do not accumulate nested manager, player, season or award instances. The sole return-position exception is an award opened from a manager profile: retain that one manager card, its selected section and all scroll positions, and return to it when the award closes. Following a manager link from that award replaces the retained manager rather than adding another layer. No general modal stack or document-wide stacking observer.
- Publish requested changes directly. The owner performs the review; do not run extra tests or browser verification.

The original Career High bug read nonexistent high_score / career_high_score fields on manager-season rows instead of max_score, then overwrote historical highs with lower current-season results. The October 13 follow-up removes the regular-season restriction and adds year/week metadata.

## Player transaction history
History follows Splits and precedes News in both the card and its jump menu. Use the selected season’s executed ESPN league transactions and draft picks, with archived draft records as a fallback. Include dates, draft round/pick, manager names and existing manager avatars; trades identify both managers. Keep unavailable dates explicit and mark partial or failed feeds. Share requests by season, preserve History during asynchronous stat refreshes, and reject stale player/season responses. Manager links use the existing single-card lifecycle.
