/* Performance (Oct 28): pcNorm/pcBaseName are pure string functions called millions of
   times (every directory sync matched each player against every Vegas row, re-running
   Unicode normalization and regexes on both names each time). Same results, cached. */
(function(){
 if(typeof pcNorm!=='function'||typeof pcBaseName!=='function'||pcNorm.__hjMemo)return;
 const norm=pcNorm,base=pcBaseName,normCache=new Map(),baseCache=new Map(),LIMIT=60000;
 const memo=(fn,cache)=>{const f=function(value=''){const key=String(value);let out=cache.get(key);if(out===undefined){out=fn(key);if(cache.size>=LIMIT)cache.clear();cache.set(key,out)}return out};f.__hjMemo=true;return f};
 pcNorm=memo(norm,normCache);
 pcBaseName=memo(base,baseCache);
})();

/* Same rows the Vegas lookups always picked (first row of that position whose base name
   matches), from a per-pass index instead of scanning every row for every player. The
   index is rebuilt each pass, so it can never serve rows from an older feed. */
(function(){
 const indexes=new Map();let clearing=false;
 window.hjVegasRowFor=function(rows,position,name){
  if(!Array.isArray(rows)||!pcNorm(name))return undefined;
  let index=indexes.get(rows);
  if(!index){
   index=new Map();
   for(const item of rows){if(!item||!pcNorm(item.name))continue;const key=String(item.position||'').toUpperCase()+'|'+pcBaseName(item.name);if(!index.has(key))index.set(key,item)}
   indexes.set(rows,index);
   if(!clearing){clearing=true;queueMicrotask(()=>{indexes.clear();clearing=false})}
  }
  return index.get(position+'|'+pcBaseName(name));
 };
})();

/* Load-order guard: an early render can reach the standings rank before the script that
   declares it has parsed ("hjCurrentStandingRank is not defined"). Same definition; the
   later declaration and its wrapper still replace it. */
if(typeof hjCurrentStandingRank!=='function')window.hjCurrentStandingRank=function(team,data){const rank=hjNumber(team?.playoffSeed);return rank!==null&&rank>0?rank:0};
