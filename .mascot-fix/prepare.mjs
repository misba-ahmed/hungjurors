import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync('git',['fetch','origin','main']);
const src=execFileSync('git',['show','origin/main:index.html'],{maxBuffer:100*1024*1024}).toString();
const lines=src.split('\n'),found=new Set();
lines.forEach((l,i)=>{if(/matchupWeek|matchupPeriodId|function hjMatchup|function hjCurrentWeek/.test(l)&&l.length<30000)for(let j=Math.max(0,i-4);j<=Math.min(lines.length-1,i+5);j++)if(lines[j].length<30000)found.add(j)});
fs.writeFileSync('.mascot-fix/week-source.json',JSON.stringify([...found].sort((a,b)=>a-b).map(i=>({line:i+1,text:lines[i]}))));
