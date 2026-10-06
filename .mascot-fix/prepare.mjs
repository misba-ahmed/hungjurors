import fs from 'node:fs/promises';
const html=await(await fetch('https://hungjurors.com/?verify-bye='+Date.now(),{cache:'no-store'})).text();
const url=html.match(/src=["']([^"']*manager-hero[^"']*)/)[1],hero=await(await fetch(new URL(url,'https://hungjurors.com/'),{cache:'no-store'})).text();
const schedule=await(await fetch('https://hungjurors.com/data/nfl-schedule-2026.json',{cache:'no-store'})).json();
const result={label:html.includes("game:hjTeamOnBye(player.team,week)?'BYE'"),lineup:html.includes("r.asset?.isUnavailable||r.asset?.isBye"),byeHelper:html.includes('function hjByeScheduleIndex'),outsideTap:hero.includes("document.addEventListener('pointerdown'"),version:url.includes('tap-away'),scheduleGames:schedule.games?.length,checkedAt:new Date().toISOString()};
await fs.writeFile('.mascot-fix/bye-live-proof.json',JSON.stringify(result,null,2));console.log(result);if(!result.label||!result.lineup||!result.byeHelper||!result.outsideTap||!result.version||result.scheduleGames!==272)throw Error('Live verification failed');
