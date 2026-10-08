/* Opt-in iPhone crash bisection. Has no effect unless the page URL contains
 * ?hjdiag=flag,flag,... Ordinary visits are unchanged.
 * Headless engines cannot reproduce the Safari process crash on pinch zoom,
 * so each flag disables one rendering feature family (or hides one page
 * section) for a test on the physical phone. A small label shows the active
 * flags so a screenshot identifies the run.
 */
const diagnostics=`<script id="hj-zoom-diagnostics">(function(){
 let query='';try{query=new URLSearchParams(location.search).get('hjdiag')||'';}catch(_){}
 if(!query)return;
 const flags=new Set(query.split(',').map(s=>s.trim()).filter(Boolean));
 if(flags.has('all'))['flat3d','nofilter','noanim','noclip','noshadow','nocontain','nosticky','noevents'].forEach(f=>flags.add(f));
 const css=[];
 if(flags.has('flat3d'))css.push('*,*::before,*::after{transform-style:flat!important;perspective:none!important;backface-visibility:visible!important;will-change:auto!important}');
 if(flags.has('notransform'))css.push('*,*::before,*::after{transform:none!important;translate:none!important;rotate:none!important;scale:none!important}');
 if(flags.has('nofilter'))css.push('*,*::before,*::after{filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;mix-blend-mode:normal!important;background-blend-mode:normal!important}');
 if(flags.has('noanim'))css.push('*,*::before,*::after{animation:none!important;transition:none!important}');
 if(flags.has('noclip'))css.push('*,*::before,*::after{clip-path:none!important;-webkit-mask:none!important;mask:none!important}');
 if(flags.has('noshadow'))css.push('*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}');
 if(flags.has('nocontain'))css.push('*{contain:none!important}');
 if(flags.has('nosticky'))css.push('body>nav,.hj-folder-dock,.league-team-rail,#challenge-top,.wp-team-header,.hq49-controls,.hj-sticky-scorecard,.hq-matchup-switcher-shell{position:relative!important;top:auto!important}');
 if(flags.has('noimg'))css.push('img,canvas,video,svg image{visibility:hidden!important}*,*::before,*::after{background-image:none!important}');
 if(flags.has('noscroll'))css.push('*{overflow:visible!important}');
 if(flags.has('nosnap'))css.push('*{scroll-snap-type:none!important;scroll-snap-stop:normal!important;scroll-snap-align:none!important}');
 if(flags.has('nooverscroll'))css.push('*{overscroll-behavior:auto!important}');
 if(flags.has('nolegacyscroll'))css.push('*{-webkit-overflow-scrolling:auto!important}');
 if(flags.has('nohscroll'))css.push('*{overflow-x:hidden!important}');
 if(flags.has('nofonts'))css.push('*,*::before,*::after{font-family:-apple-system,Helvetica,Arial,sans-serif!important;font-variation-settings:normal!important;font-optical-sizing:none!important}');
 if(flags.has('nosvg'))css.push('svg{display:none!important}');
 if(flags.has('notext'))css.push('*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important}');
 const sections={managers:'#hj-manager-hero',wire:'#wire',week1:'.week1-wrap',news:'.ffn-wrap',nav:'body>nav',hero:'main>div:first-child',hq:'#league-hq',standings:'#standings',challenges:'#challenges',trophy:'#trophy',history:'#history',payouts:'#payouts',dues:'#dues',header:'header#top',footer:'footer'};
 for(const [name,selector] of Object.entries(sections))if(flags.has('hide-'+name))css.push(selector+'{display:none!important}');
 if(flags.has('noevents')){
  const stop=e=>e.stopImmediatePropagation();
  window.addEventListener('resize',stop,true);window.addEventListener('scroll',stop,true);
  window.visualViewport?.addEventListener('resize',stop);window.visualViewport?.addEventListener('scroll',stop);
 }
 // Native scrollers become plain clipped boxes (same clip, same scroll
 // offset, no user scrolling): 'hidescroll' always, 'zoomhide' only while
 // the page is pinch-zoomed.
 function scrollers(){return [...document.querySelectorAll('body *')].filter(el=>{const cs=getComputedStyle(el);return /^(auto|scroll)$/.test(cs.overflowX)||/^(auto|scroll)$/.test(cs.overflowY);});}
 function freeze(on){
  if(on){for(const el of scrollers()){if(el.dataset.hjDiagScroll)continue;el.dataset.hjDiagScroll='1';el.style.setProperty('overflow','hidden','important');}}
  else document.querySelectorAll('[data-hj-diag-scroll]').forEach(el=>{delete el.dataset.hjDiagScroll;el.style.removeProperty('overflow');});
 }
 if(flags.has('hiderails')){const run=()=>document.querySelectorAll('.hj-section-rail,.hq-matchup-list').forEach(el=>el.style.setProperty('overflow','hidden','important'));setTimeout(run,1500);setTimeout(run,5000);setInterval(run,15000);}
 if(flags.has('hidescroll')){const run=()=>freeze(true);setTimeout(run,1500);setTimeout(run,5000);setInterval(run,15000);}
 if(flags.has('zoomhide')&&window.visualViewport){let zoomed=false;const check=()=>{const z=visualViewport.scale>1.01;if(z!==zoomed){zoomed=z;freeze(z);}};visualViewport.addEventListener('resize',check);window.addEventListener('touchstart',e=>{if(e.touches.length>1&&!zoomed){zoomed=true;freeze(true);}},{capture:true,passive:true});window.addEventListener('touchend',()=>setTimeout(check,400),{capture:true,passive:true});}
 // 'clipscroll': scrollers become overflow:clip (not scroll containers at all;
 // same clip box, but content shows from its start).
 if(flags.has('clipscroll')){const run=()=>scrollers().forEach(el=>el.style.setProperty('overflow','clip','important'));setTimeout(run,1500);setTimeout(run,5000);setInterval(run,15000);}
 // 'cvauto': every item inside a native scroller skips rendering while it is
 // offscreen (content-visibility:auto), keeping its measured size.
 if(flags.has('cvauto')){const run=()=>scrollers().forEach(el=>{for(const item of el.children){if(item.dataset.hjDiagCv)continue;const r=item.getBoundingClientRect();if(!r.width||!r.height)continue;item.dataset.hjDiagCv='1';item.style.setProperty('contain-intrinsic-size','auto '+Math.round(r.width)+'px auto '+Math.round(r.height)+'px');item.style.setProperty('content-visibility','auto');}});setTimeout(run,2000);setTimeout(run,6000);setInterval(run,15000);}
 if(flags.has('novideo'))css.push('video{display:none!important}');
 if(flags.has('pausevideo'))setInterval(()=>document.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause();}),500);
 function apply(){
  const style=document.createElement('style');style.id='hj-zoom-diagnostics-style';style.textContent=css.join('\\n');
  document.documentElement.append(style);
  const label=document.createElement('div');label.textContent='DIAG: '+[...flags].join(', ');
  label.style.cssText='position:absolute;left:4px;top:4px;z-index:2147483647;background:#b3352c;color:#fff;font:700 11px/1.3 -apple-system,sans-serif;padding:3px 6px;border-radius:4px;pointer-events:none';
  document.body.append(label);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();</script>`;
const viewportMeta='<meta name="viewport" content="width=device-width, initial-scale=1.0">';
export function prepareZoomDiagnostics(html){
 if(html.split(viewportMeta).length!==2)throw Error('Viewport meta changed; review zoom diagnostics');
 return html.replace(viewportMeta,()=>viewportMeta+'\n'+diagnostics);
}
