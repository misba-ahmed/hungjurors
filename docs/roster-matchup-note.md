# Rosters: the Week N matchup sticky note

The clipped yellow note in each manager's roster banner (League HQ › Rosters), redesigned Nov 16 at the owner's request.

- Label "Week N matchup" with a line under it, handwritten in black permanent marker (the Permanent Marker font from Google Fonts; the page's Public Sans normalizer skips it); no LIVE/FINAL tag.
- The two managers across from each other, like the Matchup tab, everything centered in its half, with a line between them broken by "VS" level with the names, the lines drawn in black permanent marker (slightly wobbly SVG strokes with round ends) and "VS" in the marker font (Nov 16); each avatar is circled in the same marker, a loose loop that overshoots its start, drawn differently on each side (Nov 17): the roster's own manager on the left, the opponent on the right; each with avatar, name and score. Scores are colored like the Matchup tab (`hjTeamTotalAttrs`: ESPN's live projected finish, or the final score, against ESPN's original projection).
- ESPN's live projection sits next to each score (toward the middle) in small grey italics, final games included. The original projection (E, tap for Vegas) sits under the score. Before kickoff the score spot shows that E/V projection.
- Tapping the note opens the matchup in the Matchup tab, as before; the avatars don't open profiles here.
- Code: `scripts/matchup-note.js` (inserted by `scripts/prepare-matchup-note.mjs` before the roster renderer), `styles/matchup-note.css`.

## Sizes
The note's width depends on the banner layout: about 190–230px beside the player strip on desktop, 240–400px beside it on tablets, the full width under the business card on phones (the banner's columns are unchanged). Everything inside is sized by a container query on the note's own width (smaller avatar, name and score below 260px and 200px inside; below 176px the live projection goes on its own line under the score). The note uses the plain sticky-note art without the paper clip; it is stretched to the note (paper from about 3% to 97% of the width, page curl bottom right), so the padding is a share of the note's width. Check 320–1920px with the longest names before changing it: no overlap, nothing outside the note, no name cut off.


