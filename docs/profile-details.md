# Profile and challenge detail rules

Approved October 13, 2026:
- Keep the navy-and-gold waiver card; omit its redundant red Waivers badge.
- All side-challenge graphics share one zoom button: plus in fitted mode, minus in detail mode. Clicks and double taps update the same state and icon.
- Perfect Lineup award details use the full side-challenges description.
- Official Season Awards in profiles open the matching year, winner and award card, including the week for repeat prizes.
- Player-add charts show newest seasons first in a single horizontal row; never wrap bars outside the card.
- Career High means the highest completed individual week across the entire career, including regular season and all postseason games. Show the season year and week underneath. Never count a multi-week aggregate as a weekly high. Load archived weekly scores to supplement historical summaries and preserve the largest known result during loading.
- Every nested card retains its parent card and exact scroll position. Closing by button, backdrop, Escape or swipe dismisses only the top card. Keep original parent DOM, selected sections and horizontal positions. Shared card stacking covers manager, player, season, award and expanded Wire dialogs, including repeated dialog types.
- Publish requested changes directly. The owner performs the review; do not run extra tests or browser verification.

The original Career High bug read nonexistent high_score / career_high_score fields on manager-season rows instead of max_score, then overwrote historical highs with lower current-season results. The October 13 follow-up removes the regular-season restriction and adds year/week metadata.
