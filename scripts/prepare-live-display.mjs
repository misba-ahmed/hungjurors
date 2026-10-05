import {readFileSync} from 'node:fs';
const liveUpdates=readFileSync(new URL('./live-updates.js',import.meta.url),'utf8');
const news=readFileSync(new URL('./news-feed.js',import.meta.url),'utf8');
const navigation=readFileSync(new URL('./matchup-navigation.js',import.meta.url),'utf8');
const rowFit=readFileSync(new URL('./matchup-row-fit.js',import.meta.url),'utf8');
const probability=readFileSync(new URL('./espn-win-probability.js',import.meta.url),'utf8');
const patches=[
  {
    "label": "current matchup probability",
    "source": "^  const winChance=past&&[^\\n]+$",
    "flags": "gm",
    "replacement": "  const winChance=hjEspnWinProbability(game,week,data);"
  },
  {
    "label": "legacy matchup probability",
    "source": "winChance=Math\\.max\\(1,Math\\.min\\(99,Math\\.round\\(100\\/\\(1\\+Math\\.exp\\(-\\(projectionA-projectionB\\)\\/15\\)\\)\\)\\)\\)",
    "flags": "g",
    "replacement": "winChance=hjEspnWinProbability(game,week,data)"
  },
  {
    "label": "hide absent probability",
    "source": "<div class=\"hq-match-win\"><div class=\"hq-match-win-inner\">",
    "flags": "g",
    "replacement": "<div class=\"hq-match-win\"${winChance===null?' hidden':''}><div class=\"hq-match-win-inner\">"
  },
  {
    "label": "probability label",
    "source": "<b>\\$\\{past\\?'FINAL':winChance===null\\?'Unavailable':'Est\\. win chance'\\}<\\/b>",
    "flags": "g",
    "replacement": "<b>${past?'FINAL':'Win probability'}</b>"
  },
  {
    "label": "historical switcher scores",
    "source": "  const effectiveA=hjEffectiveRoster\\(teamA,data\\),effectiveB=hjEffectiveRoster\\(teamB,data\\);\\n  const liveA=[^\\n]+\\n  const scoreA=[^\\n]+",
    "flags": "g",
    "replacement": "  const scoreA=hjSideScore(game.home,week)??0,scoreB=hjSideScore(game.away,week)??0;"
  },
  {
    "label": "live clock",
    "source": "  const period=g\\.period>4\\?'OT':g\\.period\\?`Q\\$\\{g\\.period\\}`:'LIVE';",
    "flags": "g",
    "replacement": "  const period=[g.period>4?'OT':g.period?`Q${g.period}`:'LIVE',g.displayClock].filter(Boolean).join(' ');"
  },
  {
    "label": "update live row state",
    "source": "   const p=JSON\\.parse\\(el\\.dataset\\.hjGamePlayer\\),c=hjGameContextData\\(p,p\\.week\\);",
    "flags": "g",
    "replacement": "   const p=JSON.parse(el.dataset.hjGamePlayer),c=hjGameContextData(p,p.week);\n   const row=el.closest('.hj-player-v3');\n   if(row){const live=hjUpcomingForWeek(p.team,Number(p.week))?.game?.state==='in';\n    if(row.dataset.gameInProgress!==String(live))row.dataset.gameInProgress=String(live);}"
  },
  {
    "label": "remove width-dependent placement",
    "source": " const canvas=document\\.createElement\\('canvas'\\),measure=canvas\\.getContext\\('2d'\\);[^]*?(?= function displayDST)",
    "flags": "g",
    "replacement": ""
  },
  {
    "label": "remove width measurement call",
    "source": "folders\\(\\);fitRows\\(\\);fonts\\(\\);",
    "flags": "g",
    "replacement": "folders();fonts();"
  },
  {
    "label": "active news items",
    "source": "function ffnCurrentItems\\(\\)\\{[^]*?\\n\\}",
    "flags": "g",
    "replacement": "function ffnCurrentItems(){\n  return HJ_NEWS_FEED.active?.visible||[];\n}"
  },
  {
    "label": "filtered news items",
    "source": "function ffnSyncFilteredItems\\(\\)\\{[^]*?\\n\\}",
    "flags": "g",
    "replacement": "function ffnSyncFilteredItems(){\n  ffnFilteredItems=HJ_NEWS_FEED.active?.visible||[];\n}"
  },
  {
    "label": "query filters before pagination",
    "source": "  ffnSyncFilteredItems\\(\\);\\n  const reset=\\$\\('#ffn-filter-reset'\\);\\n  if\\(reset\\)reset\\.disabled=!ffnFiltersActive\\(\\);\\n  ffnRebuildRail\\(\\);\\n  \\$\\('#ffn-scroll'\\)\\?\\.scrollTo\\(\\{left:0,behavior:'auto'\\}\\);",
    "flags": "g",
    "replacement": "  const reset=$('#ffn-filter-reset');\n  if(reset)reset.disabled=!ffnFiltersActive();\n  HJ_NEWS_FEED.active=null;\n  void ffnLoadFilteredNews({returnToStart:true});"
  },
  {
    "label": "discard incomplete legacy news cache",
    "source": "  const hasCachedNews=ffnHydrateNewsCache\\(\\);",
    "flags": "g",
    "replacement": "  const hasCachedNews=false;"
  },
  {
    "label": "remove old live row highlight",
    "source": "<style id=\"hj-live-player-cell\">[^]*?<\\/style>",
    "flags": "g",
    "replacement": ""
  }
];
function once(html,pattern,replacement,label){
 const matches=[...html.matchAll(pattern)].length;
 if(matches!==1)throw Error(`${label}: expected one source block, got ${matches}`);
 return html.replace(pattern,()=>replacement);
}
export function prepareLiveDisplay(html){
 for(const {source,flags,replacement,label} of patches)html=once(html,new RegExp(source,flags),replacement,label);
 html=once(html,/function hjLeagueUrl\(/g,probability+'\nfunction hjLeagueUrl(','ESPN probability helper');
 html=once(html,/async function ffnPlayersLatest\(players\)\{[^]*?(?=async function ffnInit\()/g,news+'\n','chronological news loader');
 html=once(html,/<script id="hj-native-nonsticky-swipe">[^]*?<\/script>/g,'<script id="hj-native-nonsticky-swipe">'+navigation+'</script>','matchup navigation');
 html=html.replace(/^\.hj-player-v3(?:\.is-right)?\[data-narrow-info="true"\][^\n]*\n/gm,'');
 html=html.replace(/(?:#league-hq :is\(\.league-player,\.hq-player-card\)|\.league-player|\.hq-lineup-player|\.hq-player-card|\.hj-player-v2|\.hj-player-v3):hover\{[^}]*\}/g,'');
 html=once(html,/function hjFitStarterSpace\(\)\{\n const lineup=[^]*?\n\}/g,rowFit,'single-column starter fitting');
 html=once(html,/<script id="hj-stable-live-updates">[^]*?<\/script>/g,'<script id="hj-stable-live-updates">'+liveUpdates+'</script>','persistent live layout');
 html=once(html,/function hjCenterMatchupRailV33\(\)\{[^]*?\n  \}/g,`const hjMatchupRailSelectionsV33=new WeakMap();
  function hjCenterMatchupRailV33(){
   const rail=document.querySelector('#hq-matchup-content .hq-matchup-switcher');
   if(!rail)return;
   const selected=rail.querySelector('.hq-matchup-jump.active'),key=selected?.dataset.hqMatchupJump||'';
   if(hjMatchupRailSelectionsV33.get(rail)===key)return;
   hjMatchupRailSelectionsV33.set(rail,key);
   hjCenterMatchupJumpChipV32(key);
  }`,'preserve matchup selector while refreshing');
 html=once(html,/previousRailLeft=previousRail\?\.scrollLeft\|\|0;/g,
  "previousRailLeft=previousRail?.scrollLeft||0,previousSelection=previousRail?.querySelector('.league-team-tab.active')?.dataset.leagueTeam;",'remember roster selection');
 html=once(html,/if\(!rail\)return;rail\.scrollLeft=previousRailLeft;/g,
  "if(!rail)return;if(rail===previousRail&&previousSelection===String(HJ_LEAGUE_STATE.selectedTeamId))return;rail.scrollLeft=previousRailLeft;",'preserve roster selector while refreshing');
 // Matchup deep links must not center a tall card or omit the pinned folder tabs.
 html=once(html,/card\.scrollIntoView\(\{behavior:matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\?'auto':'smooth',block:'center',inline:'center'\}\)/g,'hjScrollMatchupStart(card)','wire matchup landing');
 html=once(html,/target\.scrollIntoView\(\{behavior:'smooth',block:'nearest'\}\)/g,'hjScrollMatchupStart(target)','focused matchup landing');
 html=once(html,/target\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/g,'hjScrollMatchupStart(target)','profile matchup landing');
 html=once(html,/function hjScrollToMatchupV32\(key\)\{[^]*?\n\}/g,`function hjScrollToMatchupV32(key){hjCenterMatchupJumpChipV32(key);hjScrollMatchupStart(key);}`,'shared matchup landing');
 return html;
}
