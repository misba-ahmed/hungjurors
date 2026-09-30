/* Keep native zoom. Only full-viewport blur is suspended while magnified. */
(function(){
 const root=document.documentElement,viewport=window.visualViewport;
 const initialDensity=window.devicePixelRatio||1;
 let multiTouch=false;
 function update(){
  const magnified=multiTouch||(viewport?.scale||1)>1.05||(window.devicePixelRatio||1)>initialDensity*1.1;
  const active=root.classList.contains('hj-page-zoomed');
  if(active!==magnified)root.classList.toggle('hj-page-zoomed',magnified);
 }
 document.addEventListener('touchstart',event=>{if(event.touches.length>1){multiTouch=true;update()}},{passive:true,capture:true});
 document.addEventListener('touchend',event=>{multiTouch=event.touches.length>1;update()},{passive:true,capture:true});
 document.addEventListener('touchcancel',()=>{multiTouch=false;update()},{passive:true,capture:true});
 document.addEventListener('gesturestart',()=>{multiTouch=true;update()},{passive:true});
 document.addEventListener('gestureend',()=>{multiTouch=false;update()},{passive:true});
 viewport?.addEventListener('resize',update,{passive:true});
 window.addEventListener('resize',update,{passive:true});
 window.addEventListener('pageshow',update,{passive:true});
 update();
})();
