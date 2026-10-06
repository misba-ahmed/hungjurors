(()=>{"use strict";const figures=[{"name":"MISBA","slug":"misba","cx":67,"x":12.029545454545453,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"BRYAN","slug":"bryan","cx":167,"x":112.02954545454544,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"TYLER","slug":"tyler","cx":267,"x":212.02954545454546,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"NATHAN M","slug":"nathan-m","cx":367,"x":312.0295454545455,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"WASI","slug":"wasi","cx":467,"x":411.8772727272727,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"CESAR","slug":"cesar","cx":823,"x":768.1818181818182,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"NATHAN T","slug":"nathan-t","cx":923,"x":868.1818181818181,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"GARRETT","slug":"garrett","cx":1023,"x":968.1818181818181,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"JARRETT","slug":"jarrett","cx":1123,"x":1068.1818181818182,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728},{"name":"KAT","slug":"kat","cx":1223,"x":1168.0295454545453,"y":77.25909090909092,"width":109.63636363636364,"height":219.27272727272728}];
function heroScoreWeek(data,games=[],now=Date.now()){
 const current=Number(data?.status?.currentMatchupPeriod||data?.scoringPeriodId||1);
 const weekGames=games.filter(g=>Number(g.week)===current);
 const started=weekGames.some(g=>g.state==='in'||g.state==='post'||(Number.isFinite(Date.parse(g.kickoff))&&Date.parse(g.kickoff)<=now));
 if(started)return current;
 const schedule=data?.schedule||[],weeks=[...new Set(schedule.map(g=>Number(g.matchupPeriodId)))].filter(w=>w<=current).sort((a,b)=>b-a);
 for(const w of weeks){const matches=schedule.filter(g=>Number(g.matchupPeriodId)===w&&g.home&&g.away);
 if(matches.length>=Math.floor((data.teams||[]).length/2)&&matches.length&&matches.every(g=>['HOME','AWAY','TIE'].includes(g.winner)))return w;}
 return current===1?1:null;
}
function actual(data,id){
 let games=[];try{games=NFL_WEEK1;}catch{}
 const w=heroScoreWeek(data,games);if(w===null)return null;
 const m=(data.schedule||[]).find(g=>Number(g.matchupPeriodId)===w&&(Number(g.home?.teamId)===Number(id)||Number(g.away?.teamId)===Number(id)));
 if(!m)return null;const s=Number(m.home?.teamId)===Number(id)?m.home:m.away;
 for(const v of [s?.pointsByScoringPeriod?.[w],s?.totalPointsLive,s?.totalPoints])if(v!=null&&v!==''&&Number.isFinite(Number(v)))return Number(v);
 return null;
}
function boot(){const logo=document.querySelector('.hero-in > img.logo');if(!logo||document.getElementById('hj-manager-hero'))return;const ns='http://www.w3.org/2000/svg',el=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs||{}))n.setAttribute(k,v);parent?.append(n);return n;};
const host=document.createElement('div');host.id='hj-manager-hero';host.className='hj-manager-hero';const svg=el('svg',{viewBox:'0 0 1290 450',role:'group','aria-label':'League managers: touch or hover for current fantasy scores'},host);
el('image',{href:logo.src,x:420,y:0,width:450,height:450,'aria-hidden':'true'},svg);
const defs=el('defs',{},svg),shadow=el('radialGradient',{id:'hj-manager-ground-shadow'},defs);
el('stop',{offset:'0%','stop-color':'#17344f','stop-opacity':'.28'},shadow);
el('stop',{offset:'48%','stop-color':'#17344f','stop-opacity':'.14'},shadow);
el('stop',{offset:'100%','stop-color':'#17344f','stop-opacity':'0'},shadow);
const shadows=figures.map(f=>el('ellipse',{cx:f.cx,cy:281,rx:48,ry:9,fill:'url(#hj-manager-ground-shadow)','pointer-events':'none','aria-hidden':'true',visibility:'hidden'},svg));
const groups=figures.map(f=>{const g=el('g',{'data-hero-manager':f.name,visibility:'hidden',tabindex:'0',role:'button','aria-label':f.name+': show current fantasy score'},svg);el('rect',{x:f.cx-50,y:80,width:100,height:201,fill:'transparent'},g);el('image',{href:'/assets/'+(f.slug==='jarrett'?'managers-v8':'managers-v4')+'/'+f.slug+'-standing.webp',x:f.x,y:f.y,width:f.width,height:f.height,'pointer-events':'none','aria-hidden':'true'},g);return g;});
const bubble=el('g',{'pointer-events':'none',visibility:'hidden','aria-hidden':'true'},svg);el('rect',{x:-57,y:0,width:114,height:44,rx:22,fill:'#17344f',stroke:'#bb9134','stroke-width':2},bubble);el('path',{d:'M-7 44 L0 51 L7 44',fill:'#17344f'},bubble);const text=el('text',{x:0,y:30,'text-anchor':'middle',fill:'#fff','font-family':'Arial,sans-serif','font-size':25,'font-weight':700},bubble);
let selected=-1,drag=null,pinching=false;
function refresh(){if(selected<0)return;let data;try{data=HJ_LEAGUE_STATE.data;}catch{return;}const name=figures[selected].name,team=(data?.teams||[]).find(t=>typeof hjMatchManager==='function'&&String(hjMatchManager(t,data)).toUpperCase()===name),value=team?actual(data,team.id):null;text.textContent=value===null?'—':value.toFixed(2);bubble.setAttribute('transform','translate('+figures[selected].cx+' 25)');bubble.setAttribute('visibility','visible');groups[selected].setAttribute('aria-label',name+': '+(value===null?'score unavailable':value.toFixed(2)+' fantasy points'));}

const originalCenters=figures.map(f=>f.cx),slots=[...originalCenters];
let orderKey='';
function syncStandings(){
 let data;try{data=HJ_LEAGUE_STATE.data;}catch{return;}
 if(!data?.teams?.length||typeof hjMatchManager!=='function')return;
 const rows=data.teams.map(t=>({short:hjMatchManager(t,data),w:Number(t.record?.overall?.wins)||0,pf:Number(t.record?.overall?.pointsFor)||0}));
 if(!Array.isArray(rows)||!rows.length)return;
 const ordered=typeof standingsSort==='function'?standingsSort(rows,'standings'):[...rows].sort((a,b)=>(Number(b.w)||0)-(Number(a.w)||0)||(Number(b.pf)||0)-(Number(a.pf)||0));
 const names=[...new Set(ordered.map(r=>String(r.short).toUpperCase()))].filter(n=>figures.some(f=>f.name===n));
 if(names.length!==figures.length)return; // Keep last complete order during partial refreshes.
 const key=names.join('|');if(key===orderKey)return;orderKey=key;
 names.forEach((name,rank)=>{const i=figures.findIndex(f=>f.name===name),f=figures[i];f.cx=slots[rank];groups[i].setAttribute('transform','translate('+(f.cx-originalCenters[i])+' 0)');groups[i].setAttribute('data-standing-rank',rank+1);svg.insertBefore(groups[i],bubble);});
 groups.forEach(g=>g.setAttribute('visibility','visible'));shadows.forEach(g=>g.setAttribute('visibility','visible'));
 refresh();
}

function select(i){if(!orderKey)return;selected=i;refresh();}function at(x,y){const r=svg.getBoundingClientRect(),px=(x-r.left)*1290/r.width,py=(y-r.top)*450/r.height;if(py<50||py>300)return -1;return figures.findIndex(f=>Math.abs(px-f.cx)<=50);}
groups.forEach((g,i)=>{g.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')select(i);});g.addEventListener('focus',()=>select(i));g.addEventListener('click',()=>select(i));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i);}});});
function dismiss(){selected=-1;drag=null;bubble.setAttribute('visibility','hidden');}
document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('[data-hero-manager]')||!host.contains(e.target))dismiss();},{passive:true,capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss();});
host.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){selected=-1;bubble.setAttribute('visibility','hidden');}});
host.addEventListener('touchstart',e=>{if(e.touches.length!==1){pinching=true;drag=null;return;}pinching=false;const t=e.touches[0];drag={x:t.clientX,y:t.clientY};const i=at(t.clientX,t.clientY);if(i>=0)select(i);},{passive:true});
host.addEventListener('touchmove',e=>{if(pinching||e.touches.length!==1||!drag)return;const t=e.touches[0],dx=t.clientX-drag.x,dy=t.clientY-drag.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return;}const i=at(t.clientX,t.clientY);if(i>=0)select(i);},{passive:true});
host.addEventListener('touchend',()=>{drag=null;pinching=false;},{passive:true});host.addEventListener('touchcancel',()=>{drag=null;pinching=false;},{passive:true});
logo.replaceWith(host);syncStandings();setInterval(()=>{if(!document.hidden){syncStandings();if(selected>=0)refresh();}},1500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();