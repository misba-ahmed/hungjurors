import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const workflow=await readFile('.github/workflows/refresh-pff.yml','utf8');
const inline=workflow.split("node --input-type=module <<'DATA_SCRIPT'\n")[1]?.split('          DATA_SCRIPT')[0];
if(!inline)throw Error('Production collector missing');
const scratch=await mkdtemp(join(tmpdir(),'hj-vegas-live-'));
try{
 const modulePath=join(scratch,'collector.mjs');
 await writeFile(modulePath,inline.split('\n').map(line=>line.replace(/^ {10}/,'')).join('\n'));
 process.env.DATA_UNIT_TEST='1';
 const {collectScheduledBrowserVegas}=await import(pathToFileURL(modulePath).href);
 const html=await readFile('index.html','utf8');
 const season=Number(html.match(/const NFL_SEASON\s*=\s*(\d{4})/)?.[1]);
 const results=await collectScheduledBrowserVegas(season);
 for(const [kind,result] of Object.entries(results)){
  if(result.error)throw result.error;
  const data=result.data;
  console.log(JSON.stringify({kind,rows:data.rows.length,checkedAt:data.checkedAt,publishedAt:data.publishedAt,
   samples:data.rows.filter(r=>['Josh Allen','Jahmyr Gibbs','Puka Nacua','Trey McBride','Brock Bowers'].includes(r.name)).map(({name,position,sourceProjection})=>({name,position,sourceProjection}))}));
 }
}finally{await rm(scratch,{recursive:true,force:true});}
