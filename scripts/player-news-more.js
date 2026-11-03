/* Player profile → Latest updates: "Show more" (Nov 2, 2026).
 *
 * The profile showed the 4 newest updates although it already downloads up to 50 for the player
 * (pcLoadPlayerNews). A "Show more" button under the list now adds 5 more per tap from that download,
 * until all of them are shown. How many are shown is kept while that profile stays open (a season switch
 * redraws the list at the same length) and starts again at 4 the next time a profile opens.
 *
 * No site logic is copied or replaced: which updates belong to the player, their order and duplicates are
 * decided by the site's own pcNewsForPlayer (it returns the 4 newest; asked again without the updates already
 * taken, it returns the next 4), and each update is drawn by the site's own pcNewsBody.
 */
(function(){
 if(typeof pcRenderPlayerNews!=='function'||typeof pcNewsForPlayer!=='function'||typeof pcNewsBody!=='function'||typeof pcLoadPlayerNews!=='function')return;
 const STEP=5;
 const counts=new WeakMap(); // open profile -> Map(player id -> updates shown)
 // The key pcNewsForPlayer itself uses to drop duplicates.
 const keyOf=item=>String(item.id||(typeof ffnNewsSignature==='function'?ffnNewsSignature(item):`${item.published_at}|${item.text}`));
 function allUpdates(player,items){
  const out=[],used=new Set();let left=items;
  for(let guard=0;guard<100;guard++){
   const next=pcNewsForPlayer(player,left).filter(item=>!used.has(keyOf(item)));if(!next.length)break;
   next.forEach(item=>{used.add(keyOf(item));out.push(item)});
   left=left.filter(item=>!used.has(keyOf(item)));
  }
  return out;
 }
 function draw(target,all,count,remember){
  const list=target.querySelector('.pc-news-list');if(!list)return;
  const have=list.querySelectorAll('.pc-news-item').length;
  if(count>have){
   const tpl=document.createElement('template');tpl.innerHTML=pcNewsBody(all.slice(have,count),false);
   tpl.content.querySelectorAll('.pc-news-item').forEach(el=>list.appendChild(el));
  }
  target.querySelector('.pc-news-more')?.remove();
  const shownNow=list.querySelectorAll('.pc-news-item').length,left=all.length-shownNow;
  if(left<=0)return;
  const button=document.createElement('button');button.type='button';button.className='pc-news-more';
  button.textContent=`Show more · ${left} older`;
  button.addEventListener('click',()=>{const next=Math.min(all.length,shownNow+STEP);remember(next);draw(target,all,next,remember)});
  target.appendChild(button);
 }
 const base=pcRenderPlayerNews;
 pcRenderPlayerNews=async function(player,root,token){
  await base.apply(this,arguments);
  const active=pcActive;if(!active||active.token!==token)return;
  const target=root.querySelector('[data-pc-player-news]');if(!target)return;
  let fetched=[];try{fetched=await pcLoadPlayerNews(player)}catch(_){}
  if(pcActive!==active||active.token!==token||!target.isConnected)return;
  // Same updates, in the same order, as the list the profile just drew.
  const all=allUpdates(player,[...fetched,...(typeof ffnItems!=='undefined'?ffnItems:[])]);
  if(!counts.has(active))counts.set(active,new Map());
  const byPlayer=counts.get(active),id=String(player.id||player.name||'');
  draw(target,all,byPlayer.get(id)||4,n=>byPlayer.set(id,n));
 };
 if(!document.getElementById('hj-player-news-more-style')){
  const style=document.createElement('style');style.id='hj-player-news-more-style';
  style.textContent='.pc-news-more{display:block;margin:10px auto 0;padding:8px 14px;border:1px solid rgba(20,50,79,.2);border-radius:999px;background:#fff;color:var(--navy);font:850 9.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.pc-news-more:hover{border-color:var(--brass)}';
  document.head.appendChild(style);
 }
})();
