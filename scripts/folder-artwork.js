(function(){
 const nav=document.getElementById('league-hq-tabs');if(!nav)return;
 let queued=0;const artworkURLs=new Map();
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
  queued=0;
  for(const [image,url] of artworkURLs)if(!image.isConnected){URL.revokeObjectURL(url);artworkURLs.delete(image)}
  const dock=nav.closest('.hj-folder-dock');if(!dock)return;
  const bounds=nav.getBoundingClientRect();if(!bounds.width)return;
  const buttons=[...nav.querySelectorAll('.hq-tab')],last=buttons[buttons.length-1];
  const railWidth=Math.max(nav.clientWidth,last?last.offsetLeft+last.offsetWidth+200:nav.clientWidth);
  const nr={width:railWidth};
  // Texture detail is bounded independently of browser zoom. Six full-rail
  // textures plus retained shadow copies used to grow with DPR squared.
  const ratio=Math.min(window.devicePixelRatio||1,2,4096/railWidth,
   Math.sqrt((4*1024*1024)/(railWidth*180*Math.max(1,buttons.length))));
  nav.querySelectorAll('.hq-tab').forEach((button,index)=>{
   const source=button.querySelector('.hq-folder-art');if(!source?.complete||!source.naturalWidth)return;
   const r=button.getBoundingClientRect();
   const left=button.offsetLeft,scale=(r.width+215)/2048;
   const paintKey=[railWidth,r.width,left,ratio].join(':');
   const sourceURL=source.src;
   if(button._hjFolderPaint?.key===paintKey&&button._hjFolderPaint.source===sourceURL)return;
   const ticket=button._hjFolderPaint={key:paintKey,source:sourceURL};
   // Paint off-document, then keep only an ordinary static image in the page.
   // A live full-rail canvas on every tab needlessly retains graphics surfaces.
   const canvas=document.createElement('canvas');
   const artX=left-15,joinLeft=artX+140*scale,joinRight=artX+1100*scale;
   const width=Math.max(1,Math.floor(nr.width*ratio)),height=Math.max(1,Math.floor(180*ratio));
   if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,-10,nr.width,190);
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
   canvas.toBlob(async blob=>{
    canvas.width=canvas.height=0;
    if(button._hjFolderPaint!==ticket||!button.isConnected)return;
    if(!blob){button._hjFolderPaint=null;return}
    const url=URL.createObjectURL(blob),image=new Image();
    image.className='hj-folder-layer';image.alt='';image.setAttribute('aria-hidden','true');
    image.draggable=false;image.decoding='async';image.width=width;image.height=height;
    image.style.left=-left+'px';image.style.width=nr.width+'px';image.src=url;
    try{await image.decode()}catch{URL.revokeObjectURL(url);if(button._hjFolderPaint===ticket)button._hjFolderPaint=null;return}
    if(button._hjFolderPaint!==ticket||!button.isConnected){URL.revokeObjectURL(url);return}
    const previous=button.querySelector('.hj-folder-layer');
    if(previous)previous.replaceWith(image);else button.prepend(image);
    if(artworkURLs.has(previous)){URL.revokeObjectURL(artworkURLs.get(previous));artworkURLs.delete(previous)}
    artworkURLs.set(image,url);button.classList.add('hj-layer-ready');
   },'image/png');
  });

 }
 function schedule(){if(!queued)queued=requestAnimationFrame(render)}
 nav.addEventListener('load',e=>{if(e.target.classList.contains('hq-folder-art'))schedule()},true);

 window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
 new ResizeObserver(schedule).observe(nav);
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='aria-selected'||r.target.classList?.contains('hq-folder-art')))schedule()}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['src','aria-selected']});
 schedule();
})();

