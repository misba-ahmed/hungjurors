/* nflverse extras for the Players tab (Oct 29, 2026). See docs/players-tab.md.
 *
 * data/nflverse-extras-<season>.json, sections the site does not get elsewhere:
 *  - defense:    QB hits per team and week (nflverse team stats; ESPN's D/ST stats have no QB hits).
 *  - expected:   expected fantasy points per player and week (ffopportunity, built on nflverse play-by-play).
 *                Every position is kept: the source sometimes lists a player at his new position (Bo Melton, DB).
 *                `xfp` is the source's full-PPR figure and `rx` its expected receptions, so the site can add
 *                the league's tight-end premium (+0.5 per catch).
 *  - redzone:    red-zone opportunities per player and week: carries and targets with the ball inside the
 *                opponent's 20 (nflverse play-by-play; two-point tries and nullified plays excluded).
 *  - separation: average separation at the catch point / throw, yards (nflverse Next Gen Stats, receiving).
 *                Week 0 is the season to date; a week is listed only when the player met NGS's minimum.
 * Players are keyed by nflverse (GSIS) id throughout.
 *
 * data/player-ids.json: [gsis, espn, pfr] per recent player (nflverse players table), so the site can match
 * ESPN players, nflverse stats and snap counts by id instead of by name. Rebuilt at most daily.
 *
 * Workflow use:  node scripts/refresh-nflverse-extras.mjs _site
 *   Current season. A section that cannot be refreshed keeps the last published copy. Play-by-play (7-20 MB)
 *   is fetched again only when the published red-zone section is more than three hours old.
 *   Also the previous season: data/nflverse-extras-<season-1>.json plus data/season-supplement-<season-1>.json
 *   (the snap rows and passing air yards that season's embedded data in index.html lacks). A finished
 *   season does not change, so the last published copies are reused and only built when missing.
 * Local use:     node scripts/refresh-nflverse-extras.mjs --static 2025 <dir>   (writes both files for a season)
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const RELEASES='https://github.com/nflverse/nflverse-data/releases/download';
export const sources=season=>({
 defense:`${RELEASES}/stats_team/stats_team_week_${season}.csv.gz`,
 expected:`https://github.com/ffverse/ffopportunity/releases/download/latest-data/ep_weekly_${season}.csv`,
 redzone:`${RELEASES}/pbp/play_by_play_${season}.csv.gz`,
 separation:`${RELEASES}/nextgen_stats/ngs_receiving.csv.gz`,
 stats:`${RELEASES}/stats_player/stats_player_week_${season}.csv.gz`,
 snaps:`${RELEASES}/snap_counts/snap_counts_${season}.csv.gz`,
 players:`${RELEASES}/players/players.csv.gz`,
});
const PBP_MAX_AGE=3*3600000,IDS_MAX_AGE=24*3600000;

// CSV -> {header, rows}. `keep` (column names) limits each row object to those columns: play-by-play has
// ~370 columns and the site needs eight.
export function parseCsv(text,keep=null){
 const src=String(text||'').replace(/^﻿/,'');
 let header=null,pick=null,row=[],field='',quoted=false;const rows=[];
 const end=()=>{row.push(field);field='';
  if(!header){header=row;pick=(keep?header.map((h,i)=>[h,i]).filter(([h])=>keep.includes(h)):header.map((h,i)=>[h,i]))}
  else if(row.length>1){const o={};for(const [h,i] of pick)o[h]=row[i]??'';rows.push(o)}
  row=[]};
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(quoted){if(c==='"'){if(src[i+1]==='"'){field+='"';i++}else quoted=false}else field+=c;continue}
  if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n')end();else if(c!=='\r')field+=c;
 }
 if(field||row.length)end();
 return {header:header||[],rows};
}
const num=v=>v===''||v==null||v==='NA'?null:Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=2)=>Math.round(v*10**d)/10**d;
const need=(header,keys,what)=>{for(const k of keys)if(!header.includes(k))throw Error(`${what} is missing ${k}`)};

export function buildDefense(csv,season){
 const keys=['season','week','team','season_type','def_qb_hits'],{header,rows}=parseCsv(csv,keys);need(header,keys,'Team stats CSV');
 const out=rows.filter(r=>num(r.season)===season&&String(r.season_type||'REG').toUpperCase()==='REG').map(r=>({week:num(r.week),team:r.team,qbHit:num(r.def_qb_hits)??0})).filter(r=>r.week&&r.team);
 if(out.length<16)throw Error('Team stats CSV has too few rows');
 return out;
}
export function buildExpected(csv,season){
 const keys=['season','week','player_id','full_name','position','posteam','total_fantasy_points_exp','receptions_exp'],{header,rows}=parseCsv(csv,keys);need(header,keys,'Expected points CSV');
 const out=rows.filter(r=>num(r.season)===season&&r.player_id&&r.player_id!=='NA'&&num(r.total_fantasy_points_exp)!==null)
  .map(r=>({id:r.player_id,name:r.full_name,pos:r.position,team:r.posteam,week:num(r.week),xfp:round(num(r.total_fantasy_points_exp)),rx:round(num(r.receptions_exp)??0)}));
 if(out.length<100)throw Error('Expected points CSV has too few rows');
 return out;
}
export function buildRedzone(csv,season){
 const keys=['season','season_type','week','yardline_100','play_type','rusher_player_id','receiver_player_id','two_point_attempt'],{header,rows}=parseCsv(csv,keys);need(header,keys,'Play-by-play CSV');
 const by=new Map();
 for(const p of rows){
  if(num(p.season)!==season||p.season_type!=='REG'||num(p.two_point_attempt)===1)continue;
  const y=num(p.yardline_100);if(y===null||y>20)continue;
  const kind=p.play_type==='run'?'rush':p.play_type==='pass'?'tgt':null,id=kind==='rush'?p.rusher_player_id:kind==='tgt'?p.receiver_player_id:'';
  if(!kind||!id||id==='NA')continue;
  const key=`${id}|${p.week}`;if(!by.has(key))by.set(key,{id,week:num(p.week),rush:0,tgt:0});by.get(key)[kind]++;
 }
 const out=[...by.values()];
 if(out.length<50)throw Error('Play-by-play has too few red-zone plays');
 return out;
}
export function buildSeparation(csv,season){
 const keys=['season','season_type','week','player_gsis_id','avg_separation','targets'],{header,rows}=parseCsv(csv,keys);need(header,keys,'Next Gen Stats CSV');
 const out=rows.filter(r=>num(r.season)===season&&r.season_type==='REG'&&r.player_gsis_id&&num(r.avg_separation)!==null)
  .map(r=>({id:r.player_gsis_id,week:num(r.week),sep:round(num(r.avg_separation)),tgt:num(r.targets)??0}));
 if(out.length<50)throw Error('Next Gen Stats has too few rows for the season');
 return out;
}
export function buildIds(csv,season){
 const keys=['gsis_id','espn_id','pfr_id','last_season','display_name'],{header,rows}=parseCsv(csv,keys);need(header,keys,'Players CSV');
 const players=rows.filter(r=>r.gsis_id&&(r.espn_id||r.pfr_id)&&(num(r.last_season)??0)>=season-2).map(r=>[r.gsis_id,r.espn_id||'',r.pfr_id||'']);
 if(players.length<1000)throw Error('Players CSV has too few recent players');
 return {schema:1,source:'nflverse players',generatedAt:Date.now(),season,players};
}
// Rows the season's embedded data lacks: offensive snap rows of skill players, and QB air yards.
export function buildSupplement({statsCsv,snapsCsv,embeddedSnapsCsv,season}){
 const snaps=parseCsv(snapsCsv),embedded=parseCsv(embeddedSnapsCsv),stats=parseCsv(statsCsv,['season','season_type','week','player_id','passing_air_yards']);
 const have=new Set(embedded.rows.map(r=>`${r.game_id}|${r.player}`));
 const fields=[...embedded.header,'pfr_player_id'];
 const missing=snaps.rows.filter(r=>num(r.season)===season&&r.game_type==='REG'&&num(r.offense_snaps)>0&&['QB','RB','WR','TE','FB'].includes(r.position)&&!have.has(`${r.game_id}|${r.player}`))
  .map(r=>Object.fromEntries(fields.map(k=>[k,r[k]??''])));
 const airYards=stats.rows.filter(r=>num(r.season)===season&&String(r.season_type||'REG')==='REG'&&num(r.passing_air_yards))
  .map(r=>({id:r.player_id,week:num(r.week),passing_air_yards:num(r.passing_air_yards)}));
 return {schema:1,season,generatedAt:Date.now(),source:'nflverse',snaps:missing,airYards};
}

async function fetchText(url){
 const response=await fetch(url,{headers:{'User-Agent':'HungJurors-public-data/1.0'},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`${url} returned HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 return url.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8');
}
const BUILDERS={defense:['nflverse',buildDefense],expected:['ffopportunity',buildExpected],redzone:['nflverse play-by-play',buildRedzone],separation:['nflverse Next Gen Stats',buildSeparation]};
export async function collect(season,{request=fetchText,previous=null,now=Date.now()}={}){
 const out={schema:1,season,generatedAt:now,errors:{}},urls=sources(season);
 const saved=key=>previous?.schema===1&&previous.season===season&&previous[key]?.rows?.length?previous[key]:null;
 for(const [key,[source,build]] of Object.entries(BUILDERS)){
  if(key==='redzone'&&saved(key)&&now-saved(key).checkedAt<PBP_MAX_AGE){out[key]=saved(key);continue}
  try{out[key]={source,sourceUrl:urls[key],checkedAt:now,rows:build(await request(urls[key]),season)}}
  catch(error){
   out.errors[key]=String(error.message||error);
   if(saved(key))out[key]=saved(key);
   console.warn(`${key} refresh failed${saved(key)?' (previous copy kept)':''}: ${out.errors[key]}`);
  }
 }
 return out;
}
function embeddedSnaps(html,season){
 const start=html.indexOf('PC_EMBEDDED_JSON=['),end=html.indexOf("].join('')",start);
 if(start<0||end<0)throw Error('Embedded data not found in index.html');
 const raw=[...html.slice(start+'PC_EMBEDDED_JSON=['.length,end).matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m=>m[1]).join('');
 const encoded=JSON.parse(raw).snaps?.[String(season)];if(!encoded)throw Error('No embedded snaps for '+season);
 return gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
}
async function finishedSeason(season,html){
 const extras=await collect(season);if(Object.keys(extras.errors).length)throw Error(JSON.stringify(extras.errors));
 const urls=sources(season);
 const supplement=buildSupplement({season,statsCsv:await fetchText(urls.stats),snapsCsv:await fetchText(urls.snaps),embeddedSnapsCsv:embeddedSnaps(html,season)});
 return {extras,supplement};
}
async function published(file){
 if(!process.env.PAGES_BASE_URL)return null;
 try{const r=await fetch(new URL(`data/${file}`,process.env.PAGES_BASE_URL.replace(/\/$/,'')+'/'),{signal:AbortSignal.timeout(20000)});return r.ok?await r.json():null}catch{return null}
}
async function main(){
 const args=process.argv.slice(2),html=await readFile('index.html','utf8');
 if(args[0]==='--static'){
  const season=Number(args[1]),dir=resolve(args[2]||'data');
  const {extras,supplement}=await finishedSeason(season,html);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,`nflverse-extras-${season}.json`),JSON.stringify(extras));
  await writeFile(join(dir,`season-supplement-${season}.json`),JSON.stringify(supplement));
  console.log(`${season}: ${Object.keys(BUILDERS).map(k=>`${k} ${extras[k].rows.length}`).join(', ')}; supplement snaps ${supplement.snaps.length}, air yards ${supplement.airYards.length}`);
  return;
 }
 const site=resolve(args[0]||'_site'),season=Number(html.match(/const NFL_SEASON\s*=\s*(\d{4})/)?.[1]);
 if(!season)throw Error('Missing site season');
 await mkdir(join(site,'data'),{recursive:true});
 // Player ids (ESPN / nflverse / Pro Football Reference): daily.
 try{
  const old=await published('player-ids.json');
  const ids=old?.schema===1&&Array.isArray(old.players)&&old.players.length>=1000&&Date.now()-old.generatedAt<IDS_MAX_AGE?old:buildIds(await fetchText(sources(season).players),season);
  await writeFile(join(site,'data/player-ids.json'),JSON.stringify(ids));
  console.log(`player ids: ${ids.players.length}`);
 }catch(error){
  const old=await published('player-ids.json');
  if(old?.schema===1&&old.players?.length)await writeFile(join(site,'data/player-ids.json'),JSON.stringify(old));
  console.warn(`player ids refresh failed${old?.players?.length?' (previous copy kept)':''}: ${error.message}`);
 }
 // Previous season: reuse the published copies; build them only when they are missing.
 try{
  const prev=season-1,oldExtras=await published(`nflverse-extras-${prev}.json`),oldSupplement=await published(`season-supplement-${prev}.json`);
  const ok=(d,keys)=>d?.schema===1&&d.season===prev&&keys.every(k=>Array.isArray(d[k]?.rows??d[k])&&(d[k]?.rows??d[k]).length);
  let extras=ok(oldExtras,Object.keys(BUILDERS))?oldExtras:null,supplement=ok(oldSupplement,['snaps','airYards'])?oldSupplement:null;
  if(!extras||!supplement){const built=await finishedSeason(prev,html);extras=extras||built.extras;supplement=supplement||built.supplement;console.log(`nflverse extras ${prev}: built`)}
  await writeFile(join(site,`data/nflverse-extras-${prev}.json`),JSON.stringify(extras));
  await writeFile(join(site,`data/season-supplement-${prev}.json`),JSON.stringify(supplement));
 }catch(error){console.warn(`previous-season extras unavailable: ${error.message}`)}
 const previous=await published(`nflverse-extras-${season}.json`);
 const out=await collect(season,{previous});
 if(!Object.keys(BUILDERS).some(k=>out[k]))throw Error('No nflverse extras available: '+JSON.stringify(out.errors));
 await writeFile(join(site,`data/nflverse-extras-${season}.json`),JSON.stringify(out));
 console.log(`nflverse extras ${season}: ${Object.keys(BUILDERS).map(k=>`${k} ${out[k]?.rows.length||0}`).join(', ')}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
