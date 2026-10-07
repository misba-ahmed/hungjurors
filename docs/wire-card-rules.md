# Wire carousel card contract

Read this before changing any top-carousel card. Derived from the existing Wire markup, scripts/wire-interaction.js, scripts/card-gestures.js, scripts/wire-live.js and the approved This Week design.

## Shared behavior
- An ordinary card uses the existing responsive dimensions (currently 420px desktop, 410px through 980px, 395px through 720px). Priority desktop panels inherit an ordinary card's computed height rather than maintaining a competing size.
- Clicking/tapping noninteractive card content expands the intended card. The expand button remains available. Links, player profiles and action buttons perform their own actions.
- Focusable priority panels also support Enter/Space.
- Use the existing wireOpenExpanded, wireBindCollapse and wireCloseExpanded lifecycle. Expanded cards use the shared dialog viewport, close button, Escape/backdrop handling, background-tap collapse and shared drag/pull dismissal.
- Headers must retain wc-kicker/wc-title hooks so the shared gesture controller recognizes them. Expand controls reuse wc-expand styling.
- Expansion handlers must run AFTER the carousel's swipe guard. A swipe, scroll, pinch or canceled pointer must not become a card-opening click.
- Expanded content scrolls within the standard card. Compact BYE lists may scroll internally as explicitly requested.
- Reuse the existing swipe, keyboard arrows, trackpad physics, section chips and dots. A section chip jumps to a section rather than filtering away other cards.
- Refreshes preserve the active card key, horizontal position, nested scroll and page position. Do not add automatic rotation.
- Rail height follows the active slide; a taller slide must not reserve blank space beneath another slide.
- No new artwork, avatar crops or manager proportions for these cards.

## Explicitly approved This Week exceptions
- One carousel slide can contain three independent banners, with thin page-background gaps. No shared white outer container and no internal separators.
- Approved cream inset layout (2026-10-06): with three announcements, desktop widths above 760px use two columns, waiver above LMS on the left and BYEs spanning both rows on the right. Mobile uses three equal stacked cards. One/two announcements use the natural available grid; never reserve missing-panel slots. The WHOLE group retains exactly the ordinary carousel viewport height. Content scrolls inside, never stretches the group.
- BYE title: “Teams on BYE this week”. Each team has a cream inset box with a darker cream header containing its logo and name, followed by consistent separated player rows. Mirror the right-hand team: avatar on right, player/manager names right-aligned, header mirrored too. Manager name directly below player; no separate owner column. Compact lists scroll vertically with mobile team headers sticky. No navy backgrounds; user rejected that variant.
- LMS headline: “Eliminations start this week!” No explanatory paragraph beneath it.
- All card category labels stay at the top left with identical padding. Titles, date and logos share a left edge. On mobile, the waiver and LMS footer text links are centered, per the annotated screenshot; desktop footer actions are also centered in the approved inset layout. Countdown numbers remain centered within their units.
- Priority actions are plain text links with arrows, never large pill buttons. Compact waiver title-to-date gap is 3px; countdown and action gaps are 3–4px. Mobile BYE players use one column per NFL team, directly beneath the matching team logo, with manager subtext, scrolling within the card. Avoid split-column waiver and LMS layouts.
- Existing automatic waiver deadline, validated season schedule and Week 5 milestone control visibility.

## Audit findings, 2026-10-06
The first implementation bypassed background expansion, shared header gesture hooks, shared expand-button styling and the normal expanded viewport. Its capture-phase action listener could bypass the carousel's swipe suppression. Desktop group height was independent, and the tall mobile group initially stretched every carousel slide. These were implementation mistakes, not approved design changes.

## Verification
Use Chromium AND WebKit on the prepared actual page:
1. Desktop and mobile visual comparison, bounded card/list overflow.
2. Compact full roster scroll, manager subtext and real roster count.
3. Header/background expansion, Enter expansion, player/action targets.
4. Expanded header drag dismissal, Escape, background collapse.
5. Horizontal swipe followed by a click does not open a panel.
6. Switching to recap reduces the rail to the selected card plus normal padding.
7. Existing card-key preservation and action navigation remain intact.
Run scripts/test-wire-priorities.mjs and the existing card gesture checks. Do not claim a full test-suite pass if unrelated checks fail.

- Priority panel containers must use overflow-x:hidden and overscroll-behavior-x:auto. Only the outer carousel owns horizontal scrolling; BYE roster scrolling remains vertical. Verify internal scrollLeft stays zero in both directions. Never suppress horizontal scroll chaining: trackpad wheel gestures over each panel and the BYE list must advance the outer carousel.

- Header widths must account for their right margins. Do not combine width:100% with extra horizontal margins; that created 25px of hidden horizontal overflow.

- Cream inset boxes also contain the waiver countdown and LMS manager lineup. White outer cards retain brass borders, top-left labels, original expand controls and thin cream page gaps. Do not replace approved artwork or resize avatar crops as part of banner styling.

## October 7 update — supersedes the grouped This Week exceptions above
Each priority announcement now occupies a full ordinary-sized carousel card, with its own bottom chip. Order: Kickoff, Bye Week, Last Man Standing, followed by the existing remaining sections. No shared This Week group/chip or stacked panels. LMS includes “Lowest score this week will be eliminated.” plus original manager figures and a compact managers / one elimination summary. Keep BYE cream boxes, mirrored team rows, live roster data, ordinary dimensions, shared gestures, expansion, stable keys and refresh behavior. See docs/wire-priorities.md. Run the additional desktop/mobile Chromium/WebKit test-wire-announcements.mjs.
