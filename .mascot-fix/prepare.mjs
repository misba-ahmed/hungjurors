import fs from 'node:fs';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);const s=execFileSync('git',['show','origin/main:index.html'],{maxBuffer:80*1024*1024,encoding:'utf8'});
const lines=s.split('\n'),out=new Set();lines.forEach((l,i)=>{if(/hjMatchupCardHTML\s*=|function hjLeagueUrl|function hjFetchLeague|function hjHistoricalRoster/.test(l))for(let j=Math.max(0,i-3);j<Math.min(lines.length,i+65);j++)out.add(j)});
fs.writeFileSync('.mascot-fix/matchup-more.txt',[...out].sort((a,b)=>a-b).map(i=>(i+1)+': '+lines[i]).join('\n'));
