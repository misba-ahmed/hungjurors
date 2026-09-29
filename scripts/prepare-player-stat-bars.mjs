/* Players-tab display order; retain the existing stat calculations and sorting. */
export function preparePlayerStatBars(html){
 const defs={"RB":[["fpts","FPTS"],["snap","SNP %"],["rushYd","RUSH YD"],["recYd","REC YD"],["rushTd","RUSH TD"],["recTd","REC TD"],["rush","RUSH"],["rec","REC"],["tgt","TAR"],["catchPct","CATCH %"],["ypc","YPC"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["rostPct","ROST%"]],"WR":[["fpts","FPTS"],["snap","SNP %"],["rec","REC"],["recYd","REC YD"],["recTd","REC TD"],["tgt","TAR"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["catchPct","CATCH %"],["rostPct","ROST %"]],"QB":[["fpts","FPTS"],["snap","SNP %"],["passYd","PASS YD"],["rushYd","RUSH YD"],["passTd","PASS TD"],["rushTd","RUSH TD"],["rush","RUSH"],["passAtt","PASS ATT"],["passCmp","PASS CMP"],["cmpPct","CMP %"],["int","INT"],["airYd","AIR YD"],["passRtg","PASS RTG"],["rostPct","ROST %"]],"K":[["fpts","FPTS"],["fgm","FGM"],["xpm","XPM"],["xpa","XPA"],["fga","FGA"],["fgPct","FGM %"],["fgm60","FGM 60+"],["fgm50","FGM 50+"],["fgm40","FGM 40-49"],["fgm30","FGM 30-39"],["rostPct","ROST %"]],"TE":[["fpts","FPTS"],["snap","SNP %"],["rec","REC"],["recYd","REC YD"],["recTd","REC TD"],["tgt","TAR"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["catchPct","CATCH %"],["rostPct","ROST %"]]};
 function replace(old,value){
  if(html.split(old).length!==2)throw Error('Player stat source changed: '+old.slice(0,70));
  html=html.replace(old,()=>value);
 }
 const pattern=/const HJ40_DEFS=\{[^]*?\n  \};/;
 const block=html.match(pattern)?.[0];if(!block)throw Error('Player stat definitions missing');
 let updated=block;
 for(const [position,stats] of Object.entries(defs)){
  const row=new RegExp('    '+position+':[^\\n]+');
  if(!row.test(updated))throw Error('Missing stat position '+position);
  updated=updated.replace(row,'    '+position+':'+JSON.stringify(stats)+',');
 }
 updated=updated.replace(/('D\/ST':\[)([^\n]+)(\]\n)/,(_,start,items,end)=>start+items+',["rostPct","ROST %"]'+end);
 replace(block,updated);
 replace("key!=='pffGrade'&&(key!=='snap'||HJ40.period!=='total')","key!=='pffGrade'");
 replace("['snap','catchPct','cmpPct','fgPct','airShare','targetShare']","['snap','catchPct','cmpPct','fgPct','airShare','targetShare','rostPct']");
 replace("const value=statKey==='pffGrade'?hj40PffGrade(player):hj40Finite(raw.values[statKey]);","const value=statKey==='rostPct'?hj40RosterPercent(player):statKey==='pffGrade'?hj40PffGrade(player):hj40Finite(raw.values[statKey]);");
 replace('function hj40Snapshot(player){',`function hj40RosterPercent(player){
  const id=String(player.id),pool=HJ_DATA.requests.get('players:'+NFL_SEASON+':'+hjCurrentWeek())?.value||[];
  const candidates=[HJ_PLAYER_DIRECTORY.espnCache.get(id),player._leagueEntry,HJ_ESPN_HQ_POOL.byId.get(id),pool.find(e=>String(hjPlayer(e).id)===id)];
  for(const entry of candidates){
   const p=hjPlayer(entry);
   for(const value of [entry?.ownership?.percentOwned,p?.ownership?.percentOwned,entry?.playerPoolEntry?.ownership?.percentOwned]){
    if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))return Number(value);
   }
  }
  return player.pct===null||player.pct===undefined||player.pct===''?null:hj40Finite(player.pct);
 }
 function hj40Snapshot(player){`);
 return html;
}
