import {readFileSync} from 'node:fs';
const ranks=readFileSync(new URL('./defense-fantasy-ranks.js',import.meta.url),'utf8');
export function prepareDefenseFantasyRanks(html){
 function replace(old,next){
  if(html.split(old).length!==2)throw Error('Defense rank source changed: '+old.slice(0,80));
  html=html.replace(old,()=>next);
 }
 const start=html.indexOf('hjEnsureFantasyRanks=async function(){');
 const end=html.indexOf('\nhjFantasyRankForEntry=function(entry)',start);
 if(start<0||end<start)throw Error('Defense rank loader missing');
 replace(html.slice(start,end),ranks.trimEnd());
 replace("rows=>rows.filter(e=>Number(e.player.defaultPositionId)===16)","rows=>{const entries=rows.filter(e=>Number(e.player.defaultPositionId)===16);hjPublishDefenseFantasyRanks(entries,season);return entries}");
 replace("function hjRefreshGameContexts(){","function hjRefreshGameContexts(){\n hjRefreshDefenseRankLabels();");
 return html;
}
