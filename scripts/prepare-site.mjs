import {readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const bannerRenderers=readFileSync(new URL('./banner-renderers.js',import.meta.url),'utf8');
function replaceOnce(html,pattern,replacement){
 if([...html.matchAll(pattern)].length!==1)throw Error('Weekly banner markup changed; review site preparation');
 return html.replace(pattern,()=>replacement);
}
export function prepareSite(html){
 const old='Date.now()-at<60*60*1000&&data.updated';
 if(html.split(old).length!==2)throw Error('Projection freshness setting changed; review site preparation');
 html=replaceOnce(html,/^  cards\.push\(\{section,html:wireCard\(\{kicker:`Week \$\{week\} Recap`[^\n]+$/gm,
  '  cards.push({section,html:wireCard({kicker:`Week ${week} Recap`,tag:\'Final\',cls:\'is-lead is-week-recap\',body:wireRecapSummary(week,results,high,low,close,blow,avg,under10)})});');
 html=replaceOnce(html,/^ const sideHTML=\(side,right=false\)=>[^\n]+$/gm,
  ' const sideHTML=(side,right=false)=>wireSummarySide(side,right);');
 html=replaceOnce(html,/function wireRecapCards\(data,week\)\{/g,bannerRenderers+'\nfunction wireRecapCards(data,week){');
 return html.replace(old,'Date.now()-at<90*60*1000&&data.updated')
  .replace('</head>','<link rel="stylesheet" href="/styles/season-projection-stats.css?v=20260917b">\n<link rel="stylesheet" href="/styles/weekly-banner.css?v=20260917b">\n</head>');
}
if(process.argv[2])await writeFile(process.argv[2],prepareSite(await readFile(process.argv[2],'utf8')));
