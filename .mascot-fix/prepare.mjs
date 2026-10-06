import fs from 'node:fs';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);
const s=execFileSync('git',['show','origin/main:index.html'],{maxBuffer:80*1024*1024,encoding:'utf8'});
const lines=s.split('\n');const selected=new Set();
lines.forEach((l,i)=>{if(/matchupWeek|function hj.*Matchup|function hj.*Week|function hj.*[Ll]oad|will.*load|loading.*matchup/i.test(l)&&l.length<20000)for(let j=Math.max(0,i-8);j<Math.min(lines.length,i+25);j++)selected.add(j);});
fs.writeFileSync('.mascot-fix/matchup-source.txt',[...selected].sort((a,b)=>a-b).map(i=>(i+1)+': '+(lines[i].length>20000?'[large embedded asset]':lines[i])).join('\n'));
