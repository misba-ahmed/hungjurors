import {readFileSync} from 'node:fs';
const perfectSource=readFileSync(new URL('./perfect-lineup.js',import.meta.url),'utf8');
const payouts=JSON.parse(perfectSource.match(/^const HJ_PERFECT_PAST=(\[[^\n]+\]);/)[1]);
export function preparePerfectAwards(html){
 const registrations=payouts.map(p=>{
  const display={k:'The Perfect Lineup',who:p.team.short,stat:'Week '+p.week+' · 9 of 9 targets · '+p.team.score.toFixed(2)+' points',link:'perfect',prize:p.amount,week:p.week};
  const history={award:display.k,winner:p.team.short,cash_prize:p.amount,value:p.team.score,metric:'points · Week '+p.week+' · all 9 starters met their targets',week:p.week};
  return `if(!DATA.s${p.season}.awards.some(a=>a.link==='perfect'&&a.who===${JSON.stringify(p.team.short)}&&a.week===${p.week}))DATA.s${p.season}.awards.push(${JSON.stringify(display)});
if(!HIST.season_awards['${p.season}'].some(a=>a.award==='The Perfect Lineup'&&a.winner===${JSON.stringify(p.team.short)}&&a.week===${p.week}))HIST.season_awards['${p.season}'].push(${JSON.stringify(history)});`;
 }).join('\n');
 const anchor=/^const HIST = [^\n]+\n/m;
 if(!anchor.test(html))throw Error('Historical award source missing');
 html=html.replace(anchor,line=>line+registrations+'\n');

 // Read the shared ledger at render time so current-season awards reach profiles and earnings.
 html=html.replaceAll('(awardsByName[name]||[])','managerAwards(name)').replaceAll('const awards=awardsByName[name]||[];','const awards=managerAwards(name);');
 html=html.replace('  const careerWinningsBreakdown = name => {',`  const managerAwards=name=>Object.entries(HIST.season_awards).flatMap(([year,rows])=>rows.filter(a=>a.winner===name).map(a=>({...a,year:Number(year)}))).sort((a,b)=>b.year-a.year||(b.week||0)-(a.week||0));
  const careerWinningsBreakdown = name => {`);
 html=html.replace("label:shortPrizeLabel(row.award),amount,type:'award'","label:shortPrizeLabel(row.award)+(row.week?' · Week '+row.week:''),amount,type:'award'");
 html=html.replaceAll('Number(year)===2024 ? DATA.s2024.awards : DATA.s2025.awards',"(DATA['s'+Number(year)]?.awards||[])");
 html=html.replace('Number(year)===2024?DATA.s2024.awards:Number(year)===2025?DATA.s2025.awards:[]',"(DATA['s'+Number(year)]?.awards||[])");
 html=html.replace("  const detailedAwardHTML = (year, r) => {","  const detailedAwardHTML = (year, r) => {\n    if(r.link==='perfect')return '<div class=\"award-modal-content\">'+hjPerfectAwardDetail(year,r)+'</div>';");
 html=html.replace(/^const leagueAwardsHTML = .*$/m,`const leagueAwardsHTML = () => {
 const years=Object.keys(DATA).filter(k=>/^s\\d{4}$/.test(k)&&DATA[k]?.awards?.length).map(k=>Number(k.slice(1))).sort((a,b)=>b-a),latest=years[0];
 return '<div class="award-bookcase" data-year="'+latest+'"><div class="award-bookcase-nav"><div class="award-bookcase-yearrow" role="tablist" aria-label="League award year">'+years.map(y=>'<button type="button" class="award-bookcase-year'+(y===latest?' active':'')+'" data-award-year="'+y+'" role="tab" aria-selected="'+(y===latest)+'"><span class="award-bookcase-year-label">'+y+' Awards</span></button>').join('')+'</div><div class="award-bookcase-top-hint" aria-hidden="true">Flip plaques for award details ↻</div></div><div class="award-bookcase-viewport"><div class="award-bookcase-track">'+years.map(y=>awardPanelHTML(y,DATA['s'+y].awards).replace(' is-active','').replace('award-bookcase-panel"','award-bookcase-panel'+(y===latest?' is-active':'')+'"')).join('')+'</div></div></div>';
};`);

 // Repeatable prizes are additional payouts, not a fixed allocation in the season pool.
 const bonus='<a class="payout-challenge-row" href="#challenges" data-challenge-target="perfect" style="--challenge-color:#23784e"><span class="payout-challenge-dot" aria-hidden="true"></span><span class="payout-challenge-copy"><span class="payout-challenge-name">The Perfect Lineup</span><span class="payout-challenge-desc">Additional prize · Every qualifying lineup · Repeat wins allowed</span></span><strong class="payout-challenge-amount">$30 / win</strong><span class="payout-challenge-jump" aria-hidden="true">↘</span></a>';
 if(!html.includes('${challengeRows}</div>'))throw Error('Payout challenge list missing');
 return html.replace('${challengeRows}</div>','${challengeRows}'+bonus+'</div>');
}

