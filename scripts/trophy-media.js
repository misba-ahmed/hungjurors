/* Let the trophy animate when it is visible, without running a decoder
   continuously behind every other section. Never respond to pinch/zoom events. */
{
 const tv=document.getElementById('trophy-video');
 if(tv&&tv.tagName==='VIDEO'){
  const card=tv.closest('.t-case');
  let visible=false;
  tv.muted=true;tv.defaultMuted=true;tv.autoplay=false;
  tv.removeAttribute('autoplay');
  const sync=()=>{
   const active=visible&&!document.hidden;
   card?.classList.toggle('hj-trophy-visible',active);
   if(active){const pending=tv.play();pending?.catch(()=>{});}
   else tv.pause();
  };
  if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>{
    visible=entries.some(entry=>entry.isIntersecting);sync();
   },{rootMargin:'120px'});
   observer.observe(tv);
  }else{visible=true;sync();}
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>tv.pause());
  window.addEventListener('pageshow',sync);
 }
}
