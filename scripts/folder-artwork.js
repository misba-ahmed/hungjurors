(function(){
 const nav=document.getElementById('league-hq-tabs');if(!nav)return;
 let queued=0;
 // Preserve the source's paper surfaces. A vertical slice through the
 // undecorated tab neck gives the labels clearance above all paper edges.
 const bands=[[0,107,-6,26],[107,190,26,70],[190,683,70,168.6]];
 function drawStrip(ctx,img,srcX,srcW,x,width){
  for(const [sy,ey,dy,de] of bands)ctx.drawImage(img,srcX,sy,srcW,ey-sy,x,dy,width,de-dy);
 }
 function render(){
  queued=0;const dock=nav.closest('.hj-folder-dock');if(!dock)return;
  const bounds=nav.getBoundingClientRect();if(!bounds.width)return;
  // Keep each moving tab local. A full-rail image on every button multiplies
  // painted surface area during native pinch zoom, even with small PNG files.
  nav.querySelectorAll('.hq-tab').forEach((button,index)=>{
   const source=button.querySelector('.hq-folder-art');if(!source?.complete||!source.naturalWidth)return;
   const r=button.getBoundingClientRect();
   const left=24,nr={width:Math.ceil(r.width)+80},scale=(r.width+215)/2048;
   const ratio=Math.min(window.devicePixelRatio||1,2);
   const paintKey=[r.width,ratio].join(':');
   const sourceURL=source.src;
   if(button._hjFolderPaint?.key===paintKey&&button._hjFolderPaint.source===sourceURL&&
    (button.querySelector('.hj-folder-layer')||button._hjFolderPaint.pending))return;
   const ticket=button._hjFolderPaint={key:paintKey,source:sourceURL,pending:true};
   if(!button.querySelector('.hj-folder-layer'))button.classList.remove('hj-layer-ready');
   // Paint off-document, then keep only an ordinary static image in the page.
   // A live full-rail canvas on every tab needlessly retains graphics surfaces.
   const canvas=document.createElement('canvas');
   const artX=left-15,joinLeft=artX+140*scale;
   const width=Math.max(1,Math.floor(nr.width*ratio)),height=Math.max(1,Math.floor(180*ratio));
   if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,-10,nr.width,190);
   // Adjacent tab caps overlap already. Do not paint rectangular wing tiles
   // over their neighbours; those create seams at a local image boundary.
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
    const sh=shadow.getContext('2d',{willReadFrequently:true});sh.shadowColor='rgba(65,45,23,.48)';
    sh.shadowBlur=5*ratio;sh.shadowOffsetY=-1.5*ratio;sh.shadowOffsetX=1*ratio;
    sh.drawImage(mask,0,0);sh.shadowColor='transparent';
    sh.globalCompositeOperation='destination-out';sh.drawImage(mask,0,0);
    ctx.save();ctx.globalCompositeOperation='destination-over';
    ctx.drawImage(shadow,0,0,width,height,0,0,nr.width,180);ctx.restore();
    // Explicitly release scratch backing stores; Safari need not collect a
    // detached canvas immediately. The finished image is already in canvas.
    mask.width=mask.height=0;shadow.width=shadow.height=0;
   }
   // Match the panel at its boundary, below the visible paper layers.
   // Only four pixels blend; no broad overlay conceals the folder stack.
   const localBottom=nav.clientHeight;
   const fade=ctx.createLinearGradient(0,localBottom-4,0,localBottom);
   fade.addColorStop(0,'rgba(249,237,215,0)');fade.addColorStop(1,'#f9edd7');
   ctx.fillStyle=fade;ctx.fillRect(0,localBottom-4,nr.width,5);
   ctx.fillStyle='#f9edd7';ctx.fillRect(0,localBottom,nr.width,180-localBottom);
   const image=new Image();
   image.className='hj-folder-layer';image.alt='';image.setAttribute('aria-hidden','true');
   image.draggable=false;image.width=width;image.height=height;
   image.style.left=-left+'px';image.style.width=nr.width+'px';
   image.onload=()=>{
    if(button._hjFolderPaint!==ticket||!button.isConnected)return;
    ticket.pending=false;
    const previous=button.querySelector('.hj-folder-layer');
    if(previous)previous.replaceWith(image);else button.prepend(image);
    button.classList.add('hj-layer-ready');
   };
   image.onerror=()=>{if(button._hjFolderPaint===ticket)button._hjFolderPaint=null};
   try{image.src=canvas.toDataURL('image/png')}
   finally{canvas.width=canvas.height=0}

  });

 }
 function schedule(){if(!queued)queued=requestAnimationFrame(render)}
 nav.addEventListener('load',e=>{if(e.target.classList.contains('hq-folder-art'))schedule()},true);

 window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
 new ResizeObserver(schedule).observe(nav);
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='aria-selected'||r.target.classList?.contains('hq-folder-art')))schedule()}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['src','aria-selected']});
 schedule();
})();

