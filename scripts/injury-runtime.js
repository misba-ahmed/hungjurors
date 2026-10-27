/* One store owns health. Scores, projections, ownership and roster membership never write it. */
const HJ_HEALTH=hjCreateHealthStore();
for(const row of HJ_INJURY_SNAPSHOT.rows)HJ_HEALTH.accept(row.id,row.code?{code:row.code,label:row.label}:null,Date.parse(HJ_INJURY_SNAPSHOT.at));
try{for(const row of JSON.parse(localStorage.getItem('hj-health-v2')||'[]'))if(Date.now()-row.at<86400000)HJ_HEALTH.accept(row.id,row.status,row.at)}catch(_){}
let hjStatusFrame=0,hjHealthTimer=null,hjHealthBusy=false;
const hjHealthAttempts=new Map();
function hjScheduleStatuses(){
 if(hjStatusFrame)return;
 hjStatusFrame=requestAnimationFrame(()=>{hjStatusFrame=0;hjApplyOfficialStatuses();if(!hjHealthTimer)hjHealthTimer=setTimeout(()=>{hjHealthTimer=null;hjRefreshOfficialStatuses()},250)});
}
async function hjRefreshOfficialStatuses(){
 if(document.hidden||hjHealthBusy)return;
 const ids=new Set();
 for(const node of document.querySelectorAll('[data-pc-id]')){
  const id=node.dataset.pcId;if(!/^\d+$/.test(id)||node.dataset.pcPosition==='D/ST'||Date.now()-(hjHealthAttempts.get(id)||0)<60000)continue;
  const r=node.getBoundingClientRect();if(r.width&&r.height&&r.bottom>=-300&&r.top<=innerHeight+300&&r.right>0&&r.left<innerWidth)ids.add(id);
 }
 if(!ids.size)return;hjHealthBusy=true;
 const queue=[...ids];let cursor=0,changed=false;
 try{await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
  while(cursor<queue.length){const id=queue[cursor++];hjHealthAttempts.set(id,Date.now());
   try{
    const url=`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${NFL_SEASON}/athletes/${id}?lang=en&region=us`;
    const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)continue;
    const player=await r.json();if(String(player.id)!==id)continue;
    const status=hjOfficialStatus(player);
    if(HJ_HEALTH.accept(id,status,Date.now())){changed=true;hjApplyOfficialStatuses()}
   }catch(_){/* Retain the last valid status on timeout, offline or malformed response. */}
  }
 }));}finally{hjHealthBusy=false;try{localStorage.setItem('hj-health-v2',JSON.stringify([...HJ_HEALTH.records.values()]))}catch(_){}}
}
new MutationObserver(records=>{
 if(records.some(r=>r.type==='attributes'||[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('.hj-espn-status'))||[...r.removedNodes].some(n=>n.nodeType===1&&n.matches('.hj-espn-status'))))hjScheduleStatuses();
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-pc-id','data-pc-position']});
document.addEventListener('scroll',hjScheduleStatuses,{passive:true,capture:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)hjScheduleStatuses()});
window.addEventListener('online',()=>{hjHealthAttempts.clear();hjScheduleStatuses()});
setInterval(hjRefreshOfficialStatuses,30000);
hjApplyOfficialStatuses();hjScheduleStatuses();
