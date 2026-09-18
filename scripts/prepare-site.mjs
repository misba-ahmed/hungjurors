import {readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const bannerRenderers=readFileSync(new URL('./banner-renderers.js',import.meta.url),'utf8');
const projectionSummary=readFileSync(new URL('./projection-summary.js',import.meta.url),'utf8');
const layoutGuard=readFileSync(new URL('./layout-guard.js',import.meta.url),'utf8');
const standingsScript=readFileSync(new URL('./standings-live.js',import.meta.url),'utf8');
const challengeScripts=['challenge-engine.js','challenge-live.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
function replaceOnce(html,pattern,replacement){
 if([...html.matchAll(pattern)].length!==1)throw Error('Source markup changed; review site preparation');
 return html.replace(pattern,()=>replacement);
}
export function prepareSite(html){
 // Season Challenges header: sticky two-line tab rail, then the challenge title, prize stamp and rules card.
 html=replaceOnce(html,/    <div class="sec-head"><h3>Season Challenges<\/h3><span class="pot" id="challenge-prize-badge">\$30<\/span><\/div>\n    <div class="tabs" id="challenge-strip" role="tablist" aria-label="Season Challenges"><\/div>\n    <div class="rules" id="challenge-rule"><\/div>\n/g,
  '    <div class="sec-head"><h3>Season Challenges</h3></div>\n    <div class="ch-top" id="challenge-top"><div class="ch-rail" id="challenge-strip" role="tablist" aria-label="Season Challenges"></div></div>\n    <div class="ch-card" id="challenge-card"><div class="ch-card-head"><h4 class="ch-title" id="challenge-title"></h4><span class="ch-stamp" id="challenge-prize-badge" aria-label="Prize">$30</span></div><p class="ch-rules" id="challenge-rule"></p><button type="button" class="ch-rules-toggle" id="challenge-rules-toggle" aria-expanded="false" aria-controls="challenge-rule">Full rules</button></div>\n');
 // Top bar: "Side Challenges" with the six menu items in the requested order and wording.
 html=replaceOnce(html,/Season Challenges <span class="nav-caret">▼<\/span>/g,'Side Challenges <span class="nav-caret">▼</span>');
 html=replaceOnce(html,/<div id="challenge-menu" class="challenge-menu" role="menu" aria-label="Season Challenges" hidden>[^]*?<\/div>\n/g,
  `<div id="challenge-menu" class="challenge-menu" role="menu" aria-label="Side Challenges" hidden>
  <button type="button" role="menuitem" data-challenge="raffle"><span>High Score Raffle</span><span class="menu-prize">$30</span></button>
  <button type="button" role="menuitem" data-challenge="lms"><span>Last Man Standing</span><span class="menu-prize">$30</span></button>
  <button type="button" role="menuitem" data-challenge="titty"><span>Titty Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="mvp"><span>MVP Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="overachiever"><span>Overachiever Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="optimizer"><span>Optimizer Special</span><span class="menu-prize">$10</span></button>
</div>
`);
 // 2026 Standings: the compact light table replaces the old dark lane dashboard (same buildStandingsAnalytics inputs).
 html=replaceOnce(html,/function standingsModeMetric\(p,mode\)\{[^]*?(?=\/\* ---- 2026 interactive league schedule ---- \*\/)/g,standingsScript+'\n');
 html=replaceOnce(html,/function renderRaffleChallenge\(out\)\{[^]*?(?=\/\* ---- Season Challenges nav dropdown ---- \*\/)/g,challengeScripts+'\n');
 const old='Date.now()-at<60*60*1000&&data.updated';
 if(html.split(old).length!==2)throw Error('Projection freshness setting changed; review site preparation');
 html=replaceOnce(html,/^  cards\.push\(\{section,html:wireCard\(\{kicker:`Week \$\{week\} Recap`[^\n]+$/gm,
  '  cards.push({section,html:wireCard({kicker:`Week ${week} Recap`,tag:\'Final\',cls:\'is-lead is-week-recap\',body:wireRecapSummary(week,results,high,low,close,blow,avg,under10)})});');
 html=replaceOnce(html,/^ const sideHTML=\(side,right=false\)=>[^\n]+$/gm,
  ' const sideHTML=(side,right=false)=>wireSummarySide(side,right);');
 html=replaceOnce(html,/function wireRecapCards\(data,week\)\{/g,bannerRenderers+'\nfunction wireRecapCards(data,week){');
 html=replaceOnce(html,/function pcSeasonProjectionHTML\([^]*?\n}\n(?=async function pcRenderVegas)/g,projectionSummary+'\n');
 html=replaceOnce(html,/  const label=`Week \$\{week\}`,panel=pcVegasPanel[^]*?(?=\n };\n for\(const kind of \['weekly','season'\])/g,
  "  target.classList.add('pc-weekly-summary');\n  target.innerHTML=pcProjectionSummaryHTML(player,data,row,state.espn,!state.done.has(kind),'week',week);");
 // Game status lines read FINAL in caps everywhere.
 html=replaceOnce(html,/`Final \$\{result\}`/g,'`FINAL ${result}`');
 html=replaceOnce(html,/<b>\$\{past\?'Final':winChance===null\?'Unavailable':'Est\. win chance'\}<\/b>/g,"<b>${past?'FINAL':winChance===null?'Unavailable':'Est. win chance'}</b>");
 // Hosted Vegas projections stay visible for 36 hours after the last verified retrieval so a collector hiccup never blanks the site.
 if(!/<\/body>\s*<\/html>\s*$/.test(html))throw Error('Page end changed; review layout guard injection');
 return html.replace(old,'Date.now()-at<36*60*60*1000&&data.updated')
  .replace('</head>','<link rel="stylesheet" href="/styles/season-projection-stats.css?v=20260917d">\n<link rel="stylesheet" href="/styles/weekly-banner.css?v=20260917b">\n<link rel="stylesheet" href="/styles/season-challenges.css?v=20260918-b3">\n<link rel="stylesheet" href="/styles/standings.css?v=20260918-a1">\n</head>')
  .replace(/<\/body>\s*<\/html>\s*$/,'<script id="hj-layout-guard">'+layoutGuard+'</script>\n</body>\n</html>\n');
}
if(process.argv[2])await writeFile(process.argv[2],prepareSite(await readFile(process.argv[2],'utf8')));
