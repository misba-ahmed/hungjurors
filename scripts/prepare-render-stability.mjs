/* Rendering-load repairs for phones. Every replacement keeps the same pixels and
 * behavior; it only changes how the browser produces them. See
 * docs/render-stability.md for the measurements behind each item.
 */
function once(html,find,replacement,label){
 const count=html.split(find).length-1;
 if(count!==1)throw Error(`Render stability source changed (${label}): expected 1 match, found ${count}`);
 return html.replace(find,()=>replacement);
}

// The trophy and award-bookcase sheens animated `left`, which forced a page
// layout and a repaint of a blurred, blended layer on every frame, forever,
// even while offscreen. The same sweep expressed as a translation runs on the
// compositor. Distances are the original `left` travel divided by the sheen's
// own width (translate percentages use the element's width): trophy
// 160%/26%, bookcase 156%/23%. rotate(10deg) is the existing static transform.
const trophySheen='@keyframes trophySheen{0%,58%{left:-42%;opacity:0}62%{opacity:.9}78%{left:118%;opacity:.9}82%,100%{left:118%;opacity:0}}';
const trophySheenTransform='@keyframes trophySheen{0%,58%{transform:translateX(0) rotate(10deg);opacity:0}62%{opacity:.9}78%{transform:translateX(615.3846%) rotate(10deg);opacity:.9}82%,100%{transform:translateX(615.3846%) rotate(10deg);opacity:0}}';
const bookcaseSheen=`  @keyframes awardBookcaseSheen{
    0%,58%{left:-38%;opacity:0}
    62%{opacity:.9}
    78%{left:118%;opacity:.9}
    82%,100%{left:118%;opacity:0}
  }`;
const bookcaseSheenTransform=`  @keyframes awardBookcaseSheen{
    0%,58%{transform:translateX(0) rotate(10deg);opacity:0}
    62%{opacity:.9}
    78%{transform:translateX(678.2609%) rotate(10deg);opacity:.9}
    82%,100%{transform:translateX(678.2609%) rotate(10deg);opacity:0}
  }`;

// The Wire countdown replaced each digit's text node every second. Every
// body-wide childList observer (DST labels, fonts, projection chips, injury
// badges, game context, layout repairs) then re-scanned the whole document,
// once per second. Updating the existing text node shows the same digits
// without creating childList records.
const countdown="node.querySelectorAll('.n').forEach((el,i)=>{const v=String(vals[i]);if(el.textContent!==v)el.textContent=v});";
const countdownText="node.querySelectorAll('.n').forEach((el,i)=>{const v=String(vals[i]),text=el.firstChild;if(text&&text.nodeType===3&&!text.nextSibling){if(text.data!==v)text.data=v}else if(el.textContent!==v)el.textContent=v});";

// ESPN serves the Jets logo at 4096x4096 (64 MB decoded) while every other
// team logo at this path is 500x500. ESPN's own image combiner returns the
// same transparent PNG at 500x500, matching the other teams.
const nflLogo='const nflLogo = abbr => `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;';
const nflLogoSized='const nflLogo = abbr => abbr===\'nyj\'?\'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/nyj.png&w=500&h=500\':`https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;';

// Endless decorative loops keep running while their section is scrolled far
// away. Pause only those loops (never one-shot entrance animations) until the
// section is near the viewport again.
const offscreen=`<style id="hj-offscreen-loops">
[data-hj-offscreen] .t-case::before,
[data-hj-offscreen] .award-bookcase-glass::after,
[data-hj-offscreen] .payout-trophy-medallion::before,
[data-hj-offscreen] .payout-trophy-medallion img,
[data-hj-offscreen] .raffle-ticket{animation-play-state:paused!important}
</style>`;
const offscreenScript=`<script id="hj-offscreen-loops-script">(function(){
 if(!('IntersectionObserver' in window))return;
 const io=new IntersectionObserver(entries=>{for(const e of entries){
  if(e.isIntersecting)e.target.removeAttribute('data-hj-offscreen');else e.target.setAttribute('data-hj-offscreen','');
 }},{rootMargin:'200px 0px'});
 ['trophy','history','payouts','challenges'].forEach(id=>{const section=document.getElementById(id);if(section)io.observe(section);});
})();</script>`;

// Mobile Safari reports pinch zoom as a window resize (innerWidth/innerHeight
// follow the visual viewport). About thirty page handlers treat resize as a
// layout change and re-measure, refit or re-render, during the zoom itself.
// The layout viewport has not changed, so those handlers are told nothing
// until it does; zooming back out to 1x delivers the resize as before.
// visualViewport listeners (which already check the zoom) are unaffected.
const zoomResizeGuard=`<script id="hj-zoom-resize-guard">(function(){
 const root=document.documentElement;let width=root.clientWidth,height=root.clientHeight;
 window.addEventListener('resize',event=>{
  const w=root.clientWidth,h=root.clientHeight;
  if(window.visualViewport&&window.visualViewport.scale>1.01&&w===width&&h===height){event.stopImmediatePropagation();return;}
  width=w;height=h;
 },true);
})();</script>`;
const viewportMeta='<meta name="viewport" content="width=device-width, initial-scale=1.0">';

// Body-wide decorators re-scan the whole page after any childList change.
// Their work (DST labels, fonts, projection chips, injury badges, game
// context, sticky-scorecard and header repairs) applies to nodes that are
// present, so a batch that only removes nodes gives them nothing to do. The
// roster rail removes distant pages after every swipe; skipping those
// removal-only batches avoids a second whole-page scan per swipe. Live
// patches still notify them (see live-updates.js).
const added='records.some(r=>r.addedNodes.length)';
const decoratorObserver='new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule()}).observe(document.body,{childList:true,subtree:true});';
const statusObserver='new MutationObserver(hjScheduleStatuses).observe(document.body,{childList:true,subtree:true});';
const contextObserver=' new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(update)}}).observe(document.body,{childList:true,subtree:true});';
const repairObserver='new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();';

export function prepareRenderStability(html){
 html=once(html,viewportMeta,viewportMeta+'\n'+zoomResizeGuard,'zoom resize guard');
 html=once(html,trophySheen,trophySheenTransform,'trophy sheen');
 html=once(html,bookcaseSheen,bookcaseSheenTransform,'bookcase sheen');
 html=once(html,countdown,countdownText,'wire countdown');
 html=once(html,nflLogo,nflLogoSized,'NFL logo source');
 html=once(html,decoratorObserver,`new MutationObserver(records=>{if(${added})schedule()}).observe(document.body,{childList:true,subtree:true});`,'decorator observer');
 html=once(html,statusObserver,`new MutationObserver(records=>{if(${added})hjScheduleStatuses()}).observe(document.body,{childList:true,subtree:true});`,'status observer');
 html=once(html,contextObserver,` new MutationObserver(records=>{if(${added}&&!queued){queued=true;requestAnimationFrame(update)}}).observe(document.body,{childList:true,subtree:true});`,'game context observer');
 if(html.split(repairObserver).length!==3)throw Error('Render stability source changed (layout repair observers)');
 html=html.split(repairObserver).join(`new MutationObserver(records=>{if(${added})schedule()}).observe(document.body,{childList:true,subtree:true});schedule();`);
 html=html.replace('</head>',()=>offscreen+'\n</head>');
 if(!/<\/body>\s*<\/html>\s*$/.test(html))throw Error('Page end changed; review offscreen loop script');
 return html.replace(/<\/body>\s*<\/html>\s*$/,()=>offscreenScript+'\n</body>\n</html>\n');
}
