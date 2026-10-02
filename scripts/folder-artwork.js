(function(){
 const nav=document.getElementById('league-hq-tabs');if(!nav)return;
 let queued=0;
 // Preserve the source's paper surfaces. A vertical slice through the
 // undecorated tab neck gives the labels clearance above all paper edges.
 const bands=[[0,107,-6,26],[107,190,26,70],[190,683,70,168.6]];
 function drawStrip(ctx,img,srcX,srcW,x,width){
  for(const [sy,ey,dy,de] of bands)ctx.drawImage(img,srcX,sy,srcW,ey-sy,x,dy,width,de-dy);
 }
 function tiles(ctx,img,srcX,srcW,left,right,scale){
  if(right<=left)return;
  const tw=srcW*scale;ctx.save();ctx.beginPath();ctx.rect(left,-10,right-left,180);ctx.clip();
  for(let x=left,i=0;x<right;x+=tw,i++){
   ctx.save();ctx.translate(x,0);if(i%2){ctx.translate(tw,0);ctx.scale(-1,1)}
   drawStrip(ctx,img,srcX,srcW,0,tw);ctx.restore();
  }ctx.restore();
 }
 function render(){
  queued=0;const dock=nav.closest('.hj-folder-dock');if(!dock)return;
  const bounds=nav.getBoundingClientRect();if(!bounds.width)return;
  // Keep nearby artwork ready for scrolling, but release offscreen pixel stores.
  // In particular, challenge zoom must not retain an invisible HQ folder stack.
  if(bounds.bottom < -600 || bounds.top > window.innerHeight+600){
   nav.querySelectorAll('.hj-folder-layer').forEach(canvas=>{
    if(canvas.width||canvas.height){canvas.width=canvas.height=0;canvas._paintKey=null;}
   });
   return;
  }
  const buttons=[...nav.querySelectorAll('.hq-tab')],last=buttons[buttons.length-1];
  const railWidth=Math.max(nav.clientWidth,last?last.offsetLeft+last.offsetWidth+200:nav.clientWidth);
  // Keep the original rail coordinates and texture phase, but allocate only
  // the visible slice plus shadow/scroll overscan, not six full-width rails.
  const cropLeft=Math.max(0,Math.floor(nav.scrollLeft/128)*128-128);
  const cropWidth=Math.min(railWidth-cropLeft,nav.clientWidth+384);
  const nr={width:railWidth};
  const ratio=window.devicePixelRatio||1;
  nav.querySelectorAll('.hq-tab').forEach((button,index)=>{
   const source=button.querySelector('.hq-folder-art');if(!source?.complete||!source.naturalWidth)return;
   let canvas=button.querySelector('.hj-folder-layer');
   if(!canvas){canvas=document.createElement('canvas');canvas.className='hj-folder-layer';canvas.setAttribute('aria-hidden','true');button.prepend(canvas)}
   const r=button.getBoundingClientRect();
   const left=button.offsetLeft,scale=(r.width+215)/2048;
   const paintKey=[railWidth,r.width,left,ratio,cropLeft,cropWidth].join(':');
   if(canvas._paintKey===paintKey&&canvas._paintSource===source.src)return;
   const artX=left-15,joinLeft=artX+140*scale,joinRight=artX+1100*scale;
   const width=Math.round(cropWidth*ratio),height=Math.round(180*ratio);
   if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
   const xOffset=(cropLeft-left)+'px';if(canvas.style.left!==xOffset)canvas.style.left=xOffset;
   const cssWidth=cropWidth+'px';if(canvas.style.width!==cssWidth)canvas.style.width=cssWidth;
   const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,-10,cropWidth,190);ctx.translate(-cropLeft,0);
   // Flat wings are sampled at their native scale and mirrored, never
   // stretched. Their upper edges match the corresponding source shoulder.
   tiles(ctx,source,100,40,0,Math.min(nr.width,Math.max(0,joinLeft+4)),scale);
   tiles(ctx,source,1100,700,Math.max(0,joinRight-4),nr.width,scale);
   // Keep the tab and all three original paper edges together in one image.
   drawStrip(ctx,source,140,960,joinLeft,960*scale);
   // Derive a clean shadow from the actual opaque paper contour. The
   // original keyed image has translucent matte pixels outside the paper;
   // filtering the whole button shadows that matte instead of the tab edge.
   {
    const mask=document.createElement('canvas');mask.width=width;mask.height=height;
    const m=mask.getContext('2d',{willReadFrequently:true});m.drawImage(canvas,0,0);
    const pixels=m.getImageData(0,0,width,height);
    for(let p=0;p<pixels.data.length;p+=4){
     pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=0;
     pixels.data[p+3]=pixels.data[p+3]>=220?255:0;
    }
    m.putImageData(pixels,0,0);
    const shadow=document.createElement('canvas');shadow.width=width;shadow.height=height;
    const sh=shadow.getContext('2d');sh.shadowColor='rgba(65,45,23,.48)';
    sh.shadowBlur=5*ratio;sh.shadowOffsetY=-1.5*ratio;sh.shadowOffsetX=1*ratio;
    sh.drawImage(mask,0,0);sh.shadowColor='transparent';
    sh.globalCompositeOperation='destination-out';sh.drawImage(mask,0,0);
    ctx.save();ctx.globalCompositeOperation='destination-over';
    ctx.drawImage(shadow,0,0,width,height,cropLeft,0,cropWidth,180);ctx.restore();
    // Release scratch stores immediately; the finished pixels are in canvas.
    mask.width=mask.height=shadow.width=shadow.height=0;
   }

   // Match the panel at its boundary, below the visible paper layers.
   // Only four pixels blend; no broad overlay conceals the folder stack.
   const localBottom=nav.clientHeight;
   const fade=ctx.createLinearGradient(0,localBottom-4,0,localBottom);
   fade.addColorStop(0,'rgba(249,237,215,0)');fade.addColorStop(1,'#f9edd7');
   ctx.fillStyle=fade;ctx.fillRect(0,localBottom-4,nr.width,5);
   ctx.fillStyle='#f9edd7';ctx.fillRect(0,localBottom,nr.width,180-localBottom);
   button.classList.add('hj-layer-ready');canvas._paintKey=paintKey;canvas._paintSource=source.src;
  });

 }
 function schedule(){if(!queued)queued=requestAnimationFrame(render)}
 nav.addEventListener('load',e=>{if(e.target.classList.contains('hq-folder-art'))schedule()},true);

 nav.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
 new ResizeObserver(schedule).observe(nav);
 new IntersectionObserver(schedule,{rootMargin:'600px'}).observe(nav);
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='aria-selected'||r.target.classList?.contains('hq-folder-art')))schedule()}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['src','aria-selected']});
 schedule();
})();
