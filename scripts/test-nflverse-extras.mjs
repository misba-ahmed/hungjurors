import assert from 'node:assert/strict';
import {parseCsv,buildDefense,buildExpected,buildRedzone,buildSeparation,buildIds,collect} from './refresh-nflverse-extras.mjs';

const team=['season,week,team,season_type,def_qb_hits,def_sacks',...Array.from({length:20},(_,i)=>`2026,${1+(i%7)},T${i},REG,${i},1`),'2026,1,NE,POST,99,0','2025,1,NE,REG,99,0'].join('\n');
const defense=buildDefense(team,2026);
assert.equal(defense.length,20,'regular-season rows of the season only');
assert.deepEqual(defense[3],{week:4,team:'T3',qbHit:3});

const head='season,posteam,week,game_id,player_id,full_name,position,total_fantasy_points_exp,receptions_exp';
const rows=Array.from({length:120},(_,i)=>`2026,DET,${1+(i%7)},g,00-${i},"Player, ${i}",${['WR','TE','RB','QB','DB'][i%5]},${(i/10).toFixed(2)},${(i%4)}`);
const expected=buildExpected([head,...rows,'2026,DET,1,g,NA,NA,NA,3.2,1'].join('\n'),2026);
assert.equal(expected.length,120,'every listed player kept (also a DB-listed receiver); id NA dropped');
assert.deepEqual(expected[1],{id:'00-1',name:'Player, 1',pos:'TE',team:'DET',week:2,xfp:0.1,rx:1},'quoted names with commas parse');
assert.throws(()=>buildExpected(head+'\n2026,DET,1,g,00-1,A,WR,1,1',2026),/too few rows/);
assert.throws(()=>buildDefense('season,week\n2026,1',2026),/missing team/);
assert.equal(parseCsv('a,b\r\n1,"x ""y"""\r\n').rows[0].b,'x "y"');

// Red zone: carries and targets inside the 20; two-point tries, sacks (no receiver) and the 21+ yard line skipped.
const pbpHead='season,season_type,week,yardline_100,play_type,rusher_player_id,receiver_player_id,two_point_attempt,desc';
const plays=[...Array.from({length:70},(_,i)=>`2026,REG,1,${5+(i%20)},run,00-R${i},NA,0,"run, left"`),'2026,REG,1,3,pass,NA,00-W1,0,x','2026,REG,1,3,pass,NA,00-W1,1,two-point','2026,REG,1,3,pass,NA,NA,0,sack','2026,REG,1,25,pass,NA,00-W1,0,x','2026,POST,1,3,run,00-R0,NA,0,x'];
const rz=buildRedzone([pbpHead,...plays].join('\n'),2026);
assert.deepEqual(rz.find(r=>r.id==='00-W1'),{id:'00-W1',week:1,rush:0,tgt:1},'only the real red-zone target counts');
assert.equal(rz.filter(r=>r.id.startsWith('00-R')).reduce((n,r)=>n+r.rush,0),58,'carries at the 5-20 only (58 of 70; the playoff carry not counted)');
const ngsHead='season,season_type,week,player_gsis_id,avg_separation,targets';
assert.equal(buildSeparation([ngsHead,...Array.from({length:60},(_,i)=>`2026,REG,${i%8},00-${i},${(2+i/100).toFixed(3)},5`),'2025,REG,0,00-x,3,1'].join('\n'),2026).length,60);
const idsHead='gsis_id,espn_id,pfr_id,last_season,display_name';
const ids=buildIds([idsHead,...Array.from({length:1100},(_,i)=>`00-${i},${i},P${i},2026,X`),'00-old,9,P9,2019,Old','00-none,,,2026,None'].join('\n'),2026);
assert.equal(ids.players.length,1100,'recent players with an ESPN or PFR id');
assert.deepEqual(ids.players[2],['00-2','2','P2']);

// A failed source keeps the last published section; a good one replaces it.
const previous={schema:1,season:2026,defense:{rows:[{week:1,team:'NE',qbHit:6}]},expected:{rows:[{id:'old'}]}};
const out=await collect(2026,{previous,request:async url=>{if(url.includes('stats_team'))throw Error('HTTP 503');return [head,...rows].join('\n')}});
assert.equal(out.defense,previous.defense,'defense kept from the last publication');
assert.equal(out.expected.rows.length,120,'expected refreshed');
assert.match(out.errors.defense,/503/);
console.log('PASS: nflverse extras parsing, red zone, separation, player ids, season filtering, kept sections on failure.');
