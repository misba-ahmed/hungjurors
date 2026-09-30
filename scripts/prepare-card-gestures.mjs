import {readFileSync} from 'node:fs';
const gestures=readFileSync(new URL('./card-gestures.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/card-gestures.css',import.meta.url),'utf8');
function once(html,from,to){
 if(html.split(from).length!==2)throw Error('Card gesture integration changed: '+from.slice(0,80));
 return html.replace(from,()=>to);
}
export function prepareCardGestures(html){
 const legacy=/<script id="hj-card-pull-close">[\s\S]*?<\/script>/g;
 if([...html.matchAll(legacy)].length!==1)throw Error('Legacy card gesture controller changed');
 html=html.replace(legacy,()=>'<style id="hj-card-gestures">'+css+'</style><script id="hj-card-pull-close">'+gestures+'</script>');
 html=once(html,"if(instant || matchMedia('(prefers-reduced-motion: reduce)').matches){ finish(); return; }","if(instant || window.hjCardGestureClosing?.(stage) || matchMedia('(prefers-reduced-motion: reduce)').matches){ finish(); return; }");
 html=once(html,"if(instant || matchMedia('(prefers-reduced-motion: reduce)').matches){finishCloseAwardModal(state);return;}","if(instant || window.hjCardGestureClosing?.(stage) || matchMedia('(prefers-reduced-motion: reduce)').matches){finishCloseAwardModal(state);return;}");
 html=once(html,"if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}","if(instant||window.hjCardGestureClosing?.(stage)||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}");
 html=once(html,"  setTimeout(()=>overlay.remove(),300);\n  setTimeout(()=>returnFocus?.focus?.({preventScroll:true}),310);","  if(window.hjCardGestureClosing?.(overlay.querySelector('.pc-modal'))){overlay.remove();returnFocus?.focus?.({preventScroll:true});}\n  else{setTimeout(()=>overlay.remove(),300);setTimeout(()=>returnFocus?.focus?.({preventScroll:true}),310);}");
 html=once(html,"  setTimeout(()=>overlay.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:210);","  if(window.hjCardGestureClosing?.(overlay.querySelector('.wire-expanded-stage')))overlay.remove();\n  else setTimeout(()=>overlay.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:210);");
 return html;
}
