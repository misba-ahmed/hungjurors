/* Reusable player artwork is selected from the same ESPN roster as the player lists. */
function hjTeamPhotoOrder(entries){
 const eligible=(entries||[]).filter(e=>{const p=hjPlayer(e);return Number(p.defaultPositionId)!==16&&Number(e.lineupSlotId)!==16;});
 const bench=eligible.filter(e=>Number(e.lineupSlotId)===20).sort(hjBenchCompare);
 const reserve=eligible.filter(e=>Number(e.lineupSlotId)===21).sort(hjBenchCompare);
 const active=eligible.filter(e=>![20,21].includes(Number(e.lineupSlotId))).sort(hjLineupCompare);
 const take=slot=>{const i=active.findIndex(e=>Number(e.lineupSlotId)===slot);return i<0?null:active.splice(i,1)[0];};
 const center=[take(17),take(6),take(4),take(2),take(0)||take(1),take(2),take(4),take(23)||take(3)||take(5)].filter(Boolean);
 center.push(...active);
 const cut=Math.ceil(bench.length/2);
 return [...bench.slice(0,cut),...center,...bench.slice(cut),...reserve];
}
function hjTeamPhotoHTML(team){
 const entries=hjTeamPhotoOrder(hjRosterEntries(team));
 if(!entries.length)return '';
 const rows=entries.map(e=>{
  const p=hjPlayer(e),id=String(p.id||e.playerId||''),asset=HJ_TEAM_PHOTO_ASSETS[id],starter=![20,21].includes(Number(e.lineupSlotId));
  const height=asset?.heightInches||73,ratio=asset?.ratio||.44;
  return {id,p,asset,starter,height,width:height*ratio};
 });
 // Physical height, rather than lineup position, sets each player's size.
 let cursor=0;
 const positions=rows.map(r=>{const left=cursor;cursor+=r.width*.86;return left;});
 const width=cursor+rows.at(-1).width*.14+4,height=Math.max(...rows.map(r=>r.height))+5;
 return '<div class="hj-team-photo" role="group" aria-label="Team photo" style="aspect-ratio:'+width.toFixed(2)+' / '+height+'">'+rows.map((r,i)=>{
  const left=(positions[i]+2)/width*100,bodyHeight=r.height/height*100,bodyWidth=r.width/width*100;
  const label=r.p.fullName+(r.starter?', starter':Number(entries[i].lineupSlotId)===21?', injured reserve':', bench');
  const src=r.asset?'/assets/team-photos/players/'+r.asset.file:hjPlayerPhoto(entries[i]);
  return '<span class="hj-team-photo-player'+(r.starter?' is-starter':'')+(!r.asset?' is-portrait':'')+'" data-team-photo-player="'+esc(r.id)+'" title="'+esc(label)+'" style="left:'+left.toFixed(4)+'%;width:'+bodyWidth.toFixed(4)+'%;height:'+bodyHeight.toFixed(4)+'%;z-index:'+(100-Math.round(Math.abs(i-(rows.length-1)/2)))+'"><img src="'+esc(src)+'" alt="'+esc(label)+'" width="'+(r.asset?.width||350)+'" height="'+(r.asset?.height||800)+'" decoding="async" draggable="false"></span>';
 }).join('')+'</div>';
}
