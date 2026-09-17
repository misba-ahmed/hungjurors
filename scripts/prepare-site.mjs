import {readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const bannerRenderers=readFileSync(new URL('./banner-renderers.js',import.meta.url),'utf8');
const projectionSummary=readFileSync(new URL('./projection-summary.js',import.meta.url),'utf8');
const challengeScripts=['challenge-engine.js','challenge-live.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
function replaceOnce(html,pattern,replacement){
 if([...html.matchAll(pattern)].length!==1)throw Error('Source markup changed; review site preparation');
 return html.replace(pattern,()=>replacement);
}
export function prepareSite(html){
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
 return html.replace(old,'Date.now()-at<90*60*1000&&data.updated')
  .replace('</head>','<link rel="stylesheet" href="/styles/season-projection-stats.css?v=20260917d">\n<link rel="stylesheet" href="/styles/weekly-banner.css?v=20260917b">\n<link rel="stylesheet" href="/styles/season-challenges.css?v=20260917-titty1">\n</head>');
}
if(process.argv[2])await writeFile(process.argv[2],prepareSite(await readFile(process.argv[2],'utf8')));
