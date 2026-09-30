import {readFileSync} from 'node:fs';
const folder=readFileSync(new URL('./folder-artwork.js',import.meta.url),'utf8');
const touch=readFileSync(new URL('../styles/touch-rendering.css',import.meta.url),'utf8');
const trophy=readFileSync(new URL('./trophy-media.js',import.meta.url),'utf8');
const zoom=readFileSync(new URL('./zoom-safety.js',import.meta.url),'utf8');
function replace(html,from,to){
 if(typeof from==='string' ? html.split(from).length!==2 : [...html.matchAll(from)].length!==1)throw Error('Zoom preparation source changed');
 return html.replace(from,()=>to);
}
export function prepareZoomSafety(html){

 // Apply at render time, before image fetches start. Do not load full portraits
 // and resize afterward: Safari may retain both decoded images during a pinch.
 html=html.replace(/<img\b[^>]*?\bsrc="\$\{esc\(([^\n]*?)\)\}"/g,(tag,expression)=>{
  if(tag.includes('pc-headshot')||! /^(?:photo|p\.headshot|player\.photo|p\.photo)$/.test(expression))return tag;
  return tag.replace('esc('+expression+')','esc(hjHeadshotSrc('+expression+'))');
 });

 // Preserve native browser zoom: media visibility has no viewport listeners.
 html=replace(html,/<video id="trophy-video"[^>]*>/g,
  '<video id="trophy-video" class="t-trophy-video" muted loop playsinline webkit-playsinline preload="none" aria-hidden="true">');
 html=replace(html,/\{\n  const tv = document.getElementById\('trophy-video'\);[\s\S]*?\n\}\n(?=\n\/\* ---- shared historical season helpers)/g,trophy);
 // The legacy Players rename runs on every HQ refresh. Update only its label,
 // so the source artwork and finished paper layer survive with the button.
 html=replace(html,"tab.textContent='Players';tab.setAttribute('aria-label','Players directory')",
  "(tab.querySelector('.hq-folder-label')||tab).textContent='Players';tab.setAttribute('aria-label','Players directory')");
 html=replace(html,/<script id="hj-folder-stack-script">[\s\S]*?<\/script>/g,'<script id="hj-folder-stack-script">'+folder+'</script>');
 html=replace(html,"ctx.putImageData(pixels,0,0);folderURL=canvas.toDataURL('image/png');",
  "ctx.putImageData(pixels,0,0);folderURL=canvas.toDataURL('image/png');canvas.width=canvas.height=0;");
 html=replace(html,'</head>','<link rel="stylesheet" href="/styles/zoom-safety.css?v=20260930-native">\n<script id="hj-zoom-safety">'+zoom+'</script>\n</head>');
 return replace(html,'</body>','<style id="hj-touch-rendering">'+touch+'</style>\n</body>');
}
