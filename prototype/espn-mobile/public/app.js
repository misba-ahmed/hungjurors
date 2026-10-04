const $=id=>document.getElementById(id);let csrf='',active=false,busy=false;
async function api(path,body){
 const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-Test-CSRF':csrf},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');return data;
}
function status(s){$('status').textContent=s;}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function frame(){if(!active)return;const f=await api('frame');$('screen').src='data:image/jpeg;base64,'+f.image;$('location').textContent='Cloud browser: '+f.origin;}
$('login').onsubmit=e=>{e.preventDefault();run(async()=>{const code=$('code').value;$('code').value='';const s=await api('login',{code});csrf=s.csrf;$('login').hidden=true;$('test').hidden=false;status('Private test opened.');});};
$('start').onclick=()=>run(async()=>{status('Starting ESPN sign-in…');await api('start',{});active=true;$('viewer').hidden=false;await frame();status('Sign in in the ESPN window.');});
$('refresh').onclick=()=>run(frame);
let down=null;
$('screen').onpointerdown=e=>{down={x:e.clientX,y:e.clientY};$('screen').setPointerCapture(e.pointerId);};
$('screen').onpointerup=e=>{if(!down)return;const d=down;down=null;const rect=$('screen').getBoundingClientRect();const dy=d.y-e.clientY;
 run(async()=>{const action=Math.abs(dy)>15?{type:'scroll',y:Math.max(-650,Math.min(650,dy*700/rect.height))}:{type:'tap',x:Math.max(0,Math.min(389,(e.clientX-rect.left)*390/rect.width)),y:Math.max(0,Math.min(699,(e.clientY-rect.top)*700/rect.height))};await api('input',action);await frame();});};
$('screen').onpointercancel=()=>down=null;
$('typing').onsubmit=e=>{e.preventDefault();const text=$('text').value;$('text').value='';if(text)run(async()=>{await api('input',{type:'text',text});await frame();});};
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>run(async()=>{await api('input',{type:'key',key:b.dataset.key});await frame();}));
$('roster').onsubmit=e=>{e.preventDefault();run(async()=>{status('Reading your team…');const r=await api('roster',{league:$('league').value,season:Number($('season').value)});$('results').replaceChildren();
 for(const t of r.teams){const h=document.createElement('h2');h.textContent=t.name;const ul=document.createElement('ul');for(const p of t.players){const li=document.createElement('li');li.textContent=p.name;ul.append(li);}$('results').append(h,ul);}
 status('Roster read succeeded. No transactions were attempted.');});};
$('end').onclick=()=>run(async()=>{active=false;await api('end',{});$('screen').removeAttribute('src');$('results').replaceChildren();$('viewer').hidden=true;$('test').hidden=true;$('login').hidden=false;csrf='';status('Session cleared.');});
setInterval(()=>{if(active&&!busy&&!document.hidden)run(frame);},2500);
try{const s=await api('session');csrf=s.csrf;$('login').hidden=true;$('test').hidden=false;active=s.started;$('viewer').hidden=!active;if(active)await frame();}catch{}
