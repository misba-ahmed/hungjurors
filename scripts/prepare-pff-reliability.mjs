// Keep verified season grades available through collector gaps without changing their timestamps.
export function preparePffReliability(html){
 const changes=[
  [
    "const HJ_PFF_SCHEMA=4,HJ_PFF_MAX_AGE=2*60*60*1000,HJ_PFF_POLL=60000;",
    "const HJ_PFF_SCHEMA=4,HJ_PFF_MAX_AGE=2*60*60*1000,HJ_PFF_RETAIN_AGE=7*24*60*60*1000,HJ_PFF_POLL=60000;"
  ],
  [
    "return hjPffValid(r,id,season)&&hjPffFresh(r)?r:null;",
    "return hjPffValid(r,id,season)&&Date.now()-r.checkedAt<HJ_PFF_RETAIN_AGE?r:null;"
  ],
  [
    "Date.now()-data.generatedAt>=HJ_PFF_MAX_AGE",
    "Date.now()-data.generatedAt>=HJ_PFF_RETAIN_AGE"
  ],
  [
    "const rows=Object.entries(data.players);if(!rows.length||rows.some(([id,r])=>!hjPffValid(r,id,NFL_SEASON)||r.checkedAt>data.generatedAt+60000))throw Error('Invalid PFF feed');",
    "const rows=Object.entries(data.players).filter(([id,r])=>hjPffValid(r,id,NFL_SEASON)&&r.checkedAt<=data.generatedAt+60000);if(!rows.length)throw Error('Invalid PFF feed');"
  ],
  [
    "const next=Object.create(null);for(const [id,row] of rows)next[`${NFL_SEASON}:${id}`]=row;",
    "const next=Object.create(null);\n for(const [key,row] of Object.entries(window.HJ_PFF_DATA)){const id=String(row.espnId);if(hjPffValid(row,id,NFL_SEASON)&&Date.now()-row.checkedAt<HJ_PFF_RETAIN_AGE)next[key]=row;}\n for(const [id,row] of rows){const key=`${NFL_SEASON}:${id}`,previous=next[key];if(Date.now()-row.checkedAt>=HJ_PFF_RETAIN_AGE||previous?.checkedAt>row.checkedAt)continue;if(row.status==='source-unavailable'&&Number.isFinite(previous?.grade))continue;next[key]=row;}"
  ],
  [
    "return {grade:Number.isFinite(row?.grade)?row.grade.toFixed(1):'—',",
    "if(row&&Number.isFinite(row.grade)&&!hjPffFresh(row))note='Last verified '+new Date(row.checkedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' · refresh delayed';\n return {grade:Number.isFinite(row?.grade)?row.grade.toFixed(1):'—',"
  ],
  [
    "if(root.dataset.pffId!==String(id)||root.dataset.pffSeason!==String(season))return;\n  for(const [selector,value]",
    "if(root.dataset.pffId!==String(id)||root.dataset.pffSeason!==String(season))return;\n  root.title=display.note;\n  for(const [selector,value]"
  ]
];
 for(const [before,after] of changes){if(!html.includes(before))throw Error('PFF source changed: '+before.slice(0,80));html=html.replace(before,()=>after);}
 return html;
}
