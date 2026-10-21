import {readFileSync} from 'node:fs';

// Ship the ten small original figures with the banner itself. A dropped or stale
// individual image request must never replace a manager with a broken-image icon.
export function prepareManagerHero(html){
 const slugs=['misba','bryan','tyler','nathan-m','wasi','cesar','nathan-t','garrett','jarrett','kat'];
 const images=Object.fromEntries(slugs.map(slug=>{
  const folder=slug==='bryan'?'managers-bryan-20261021-balanced-v4':slug==='wasi'?'managers-wasi-20261021-balanced':slug==='cesar'?'managers-cesar-20261021-consistent':slug==='kat'?'managers-kat-20261021-repair':slug==='jarrett'?'managers-v8':'managers-v4';
  const bytes=readFileSync(new URL(`../assets/${folder}/${slug}-standing.webp`,import.meta.url));
  if(bytes.length<100||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Missing or invalid original manager figure: '+slug);
  return [slug,'data:image/webp;base64,'+bytes.toString('base64')];
 }));
 const source=readFileSync(new URL('./manager-hero.js',import.meta.url),'utf8');
 const path="'/assets/'+(f.slug==='bryan'?'managers-bryan-20261021-balanced-v4':f.slug==='wasi'?'managers-wasi-20261021-balanced':f.slug==='cesar'?'managers-cesar-20261021-consistent':f.slug==='kat'?'managers-kat-20261021-repair':f.slug==='jarrett'?'managers-v8':'managers-v4')+'/'+f.slug+'-standing.webp'";
 if(source.split(path).length!==2)throw Error('Manager banner image renderer changed');
 const bundled='const HJ_HERO_FIGURES='+JSON.stringify(images)+';\n'+source.replace(path,'HJ_HERO_FIGURES[f.slug]');
 const script=/<script src="scripts\/manager-hero\.js\?[^"<>]+"><\/script>/g;
 if([...html.matchAll(script)].length!==1)throw Error('Manager banner script missing');
 return html.replace(script,()=>'<script id="hj-manager-hero-bundled">'+bundled+'</script>');
}

