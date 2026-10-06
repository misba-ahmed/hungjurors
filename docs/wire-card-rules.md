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
- Desktop panels are side by side; mobile panels stack. All panels within the group are equal-sized, and the WHOLE group must occupy exactly the same viewport height as an ordinary carousel card. Content scrolls within the cards instead of expanding the group. This supersedes the initial tall mobile stack.
- BYE title: “Teams on BYE this week”. Horizontal team logos first. Keep team names visible on mobile beside their logos; retain the existing desktop logo/name arrangement. All owned players in a scrollable compact list; manager name directly below player name. No owner column.
- LMS headline: “Eliminations start this week!” No explanatory paragraph beneath it.
- All card category labels stay at the top left with identical padding. Titles, date and logos share a left edge. On mobile, the waiver and LMS footer text links are centered, per the annotated screenshot; desktop action alignment remains unchanged. Countdown numbers remain centered within their units.
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
