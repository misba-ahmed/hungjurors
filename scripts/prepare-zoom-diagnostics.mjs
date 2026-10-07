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
 const sections={hero:'main>div:first-child',hq:'#league-hq',standings:'#standings',challenges:'#challenges',trophy:'#trophy',history:'#history',payouts:'#payouts',dues:'#dues',header:'header#top',footer:'footer'};
 for(const [name,selector] of Object.entries(sections))if(flags.has('hide-'+name))css.push(selector+'{display:none!important}');
 if(flags.has('noevents')){
  const stop=e=>e.stopImmediatePropagation();
  window.addEventListener('resize',stop,true);window.addEventListener('scroll',stop,true);
  window.visualViewport?.addEventListener('resize',stop);window.visualViewport?.addEventListener('scroll',stop);
 }
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
