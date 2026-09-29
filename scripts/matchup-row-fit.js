const HJ_STARTER_FITS=new WeakMap();
function hjFitStarterSpace(){
 const panel=document.querySelector('#hq-panel-matchups');
 if(!panel||!panel.getClientRects().length)return;
 const viewport=window.innerHeight;
 const height=selector=>document.querySelector(selector)?.getBoundingClientRect().height||0;
 const pinned=height('body > nav')+height('.hj-folder-dock')+height('#hq-panel-matchups .hq-matchup-switcher-shell');
 panel.querySelectorAll('.hj-lineup-v2').forEach(lineup=>{
  const grid=lineup.querySelector('.hj-lineup-v2-starters'),card=lineup.closest('.hq-matchup');
  if(!grid||!card||!lineup.clientWidth)return;
  lineup.removeAttribute('data-density');
  lineup.dataset.columns='1';
  const before=grid.getBoundingClientRect().top-card.getBoundingClientRect().top;
  // Scrolling, score updates and expanded panels must not resize the player rows.
  const key=[lineup.clientWidth,viewport,grid.children.length].join('|');
  if(HJ_STARTER_FITS.get(lineup)===key&&lineup.style.getPropertyValue('--hj-row-room'))return;
  HJ_STARTER_FITS.set(lineup,key);
  const visibleTop=grid.getBoundingClientRect().top;
  const top=visibleTop>=0&&visibleTop<viewport?Math.max(pinned+before,visibleTop):pinned+before;
  const available=Math.max(0,viewport-top-10);
  const set=room=>lineup.style.setProperty('--hj-row-room',String(room));
  // At phone widths, preserve the phone design. Larger screens may reduce
  // toward that same floor, but never below it or into a second column.
  if(window.innerWidth<=450){set(0);return}
  set(1);
  if(grid.getBoundingClientRect().height<=available)return;
  set(0);
  if(grid.getBoundingClientRect().height>available)return;
  let low=0,high=1;
  for(let i=0;i<7;i++){
   const middle=(low+high)/2;set(middle);
   if(grid.getBoundingClientRect().height<=available)low=middle;else high=middle;
  }
  set(low);
 });
}
(function(){
 let frame=0;
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;hjFitStarterSpace()})};
 window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);
 document.fonts?.ready.then(schedule);

 schedule();
})();
