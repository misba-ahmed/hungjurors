# Profile and challenge detail rules

Approved October 13, 2026:
- Keep the original navy-and-gold waiver card; omit its redundant red Waivers badge.
- All side-challenge graphics share one zoom button. Show plus in fitted mode and minus in detail mode. Button clicks and double taps update the same saved zoom state and icon.
- Perfect Lineup award details use the full description from the side-challenges definition.
- Official Season Awards in manager profiles open the matching year, winner and award card, including the correct week for repeat Perfect Lineup prizes.
- Manager player-add charts show newest seasons first. League Activity also shows newest first and uses a single horizontal row that scrolls when necessary. Its year range follows the available data.
- Career High means the highest completed single-week regular-season score. Preserve the historical career_high_score and manager-season max_score values; live updates may raise the maximum but never replace it with a lower current-season high. Exclude unfinished games, playoffs and multi-week aggregate totals.

The previous live profile patch read nonexistent high_score / career_high_score fields on manager-season rows instead of max_score. It treated historical results as zero and overwrote Bryan's verified 200.24 with his current-season 150.22. prepare-profile-details.mjs corrects that calculation for every manager.
