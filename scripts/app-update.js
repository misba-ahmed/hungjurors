/* Keep open copies of the site current (Nov 2, 2026).
 *
 * A Home Screen app on iPhone is rarely reloaded: iOS keeps the page alive in the background and shows it again
 * as it was, so a new version of the site can stay out of sight for hours. The deploy stamps each build with the
 * commit it was built from (<meta name="hj-build"> in the page and /version.json next to it, written by
 * prepare-site.mjs). This script compares the two:
 *  - when the app comes back to the screen (or a tab is shown again) and nothing is open on top, it reloads the new
 *    version straight away, keeping the scroll position;
 *  - while the page is in use (a profile or card open, typing), and every 5 minutes, it only shows a small
 *    "New version · Refresh" button instead of interrupting.
 * The data refreshes every 15 minutes rebuild with the same commit, so they never trigger a reload.
 */
(function(){
 const build=document.querySelector('meta[name="hj-build"]')?.content;
 if(!build)return;
 const KEY='hj:update-scroll';
 // Back from an update: put the page where it was and drop the cache-busting address part.
 try{
  const url=new URL(location.href);
  if(url.searchParams.has('hjv')){url.searchParams.delete('hjv');history.replaceState(history.state,'',url.pathname+(url.search||'')+url.hash)}
  const saved=Number(sessionStorage.getItem(KEY));sessionStorage.removeItem(KEY);
  if(saved>0){let tries=0;const put=()=>{if(document.documentElement.scrollHeight>=saved+innerHeight||tries++>40){scrollTo(0,saved);return}setTimeout(put,250)};addEventListener('load',()=>setTimeout(put,300),{once:true})}
 }catch(_){}
 const busy=()=>!!document.querySelector('.pc-modal-overlay.is-open,.manager-modal-overlay.is-open,.season-modal-overlay.is-open,.award-modal-overlay.is-open,.wire-expanded-overlay.is-open,.hj-lineup-save-card')||!!document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
 async function latest(){
  const r=await fetch(`/version.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;
  const v=(await r.json())?.build;return typeof v==='string'&&v?v:null;
 }
 // One automatic try per version: if the page that comes back is still the old one (a cache somewhere has not
 // caught up), it only offers the button, so it can never reload over and over.
 const TRIED='hj:update-tried';
 const tried=v=>{try{return sessionStorage.getItem(TRIED)===v}catch(_){return true}};
 function update(v){
  try{sessionStorage.setItem(KEY,String(Math.round(scrollY)));sessionStorage.setItem(TRIED,v)}catch(_){}
  // A new address skips the copy of the page the phone and the CDN may still hold (they keep it up to 10 minutes).
  const url=new URL(location.href);url.searchParams.set('hjv',v);location.replace(url.pathname+url.search+url.hash);
 }
 function offer(v){
  if(document.querySelector('.hj-update-pill'))return;
  const b=document.createElement('button');b.type='button';b.className='hj-update-pill';b.textContent='New version · Refresh';
  b.addEventListener('click',()=>update(v));document.body.appendChild(b);
 }
 let checking=false;
 async function check(resumed){
  if(checking||!navigator.onLine)return;checking=true;
  try{const v=await latest();if(v&&v!==build){if(resumed&&!busy()&&!tried(v))update(v);else offer(v)}}catch(_){}finally{checking=false}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check(true)});
 addEventListener('pageshow',e=>{if(e.persisted)check(true)});
 setInterval(()=>{if(!document.hidden)check(false)},5*60*1000);
 // Just opened from an old saved copy: update before it is in use.
 setTimeout(()=>check(true),1500);
 const style=document.createElement('style');style.id='hj-app-update-style';
 style.textContent='.hj-update-pill{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:20000;padding:11px 18px;border:1px solid var(--brass,#b98a2e);border-radius:999px;background:var(--navy,#14324f);color:#fff;font:850 11px/1 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;box-shadow:0 8px 24px rgba(11,43,74,.28);cursor:pointer}';
 document.head.appendChild(style);
})();
