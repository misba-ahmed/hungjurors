import {readFileSync} from 'node:fs';
const injuryRuntime=readFileSync(new URL('./injury-runtime.js',import.meta.url),'utf8');
/* Phone memory (measured with Safari Web Inspector on the user's iPhone: the
 * page held ~1 GB, about half JavaScript data and half page structure, before
 * any zoom; images and layer backing live in Safari's separate GPU process).
 *
 * Headshots: ESPN serves NFL headshots at 600x436 (about 1 MB each once
 * decoded) and the site shows ~250 of them, almost all in 17-74px circles.
 * Request them from ESPN's own image combiner at 350x254 instead: the same
 * PNG (same crop, transparency and 404 for a missing player, so the existing
 * initials fallback still runs), still at least 3x sharp in every circle, but
 * about a third of the decoded memory. The weekly recap's large feature photo
 * (up to 150px wide) keeps the original full-size file.
 */
const FULL='https://a.espncdn.com/i/headshots/nfl/players/full/';
export const HEADSHOT_SIZE='&w=350&h=254';
const literal=/https:\/\/a\.espncdn\.com\/i\/headshots\/nfl\/players\/full\/([^"'`\s<>&?\\]+?)\.png/g;
// Runtime URLs from ESPN API fields (depth charts) pass through this helper.
const helper=`<script id="hj-espn-images">function hjEspnImg(u){const p='https://a.espncdn.com';return typeof u==='string'&&u.startsWith(p+'/i/headshots/nfl/players/full/')&&/^[^?&#]+\\.png$/.test(u)?p+'/combiner/i?img='+u.slice(p.length)+'${HEADSHOT_SIZE}':u}
function hjEspnFullImg(u){return typeof u==='string'?u.replace(/\\/combiner\\/i\\?img=(\\/i\\/headshots\\/nfl\\/players\\/full\\/[^&]+\\.png)${HEADSHOT_SIZE}$/,'$1'):u}</script>`;
const viewportMeta='<meta name="viewport" content="width=device-width, initial-scale=1.0">';
const apiFields=[
 ['headshot:item?.headshot?.href || nflHeadshot(id)','headshot:hjEspnImg(item?.headshot?.href) || nflHeadshot(id)'],
 ['headshot:nested?.headshot?.href || entry?.headshot?.href || roster?.headshot || (id ? nflHeadshot(id) : \'\')','headshot:hjEspnImg(nested?.headshot?.href || entry?.headshot?.href || roster?.headshot) || (id ? nflHeadshot(id) : \'\')'],
 ['headshot:item?.headshot?.href || (id ? nflHeadshot(id) : \'\')','headshot:hjEspnImg(item?.headshot?.href) || (id ? nflHeadshot(id) : \'\')']
];
const recapFeature='aria-label="Open ${esc(p.name)} player card"><img src="${esc(photo)}"';
export function preparePhoneMemory(html){
 const before=(html.match(literal)||[]).length;
 if(before<20)throw Error('ESPN headshot URLs changed; review headshot sizing');
 html=html.replace(literal,(_,id)=>'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/'+id+'.png'+HEADSHOT_SIZE);
 for(const [from,to] of apiFields){
  const n=html.split(from).length-1;
  if(n<1)throw Error('ESPN headshot field changed: '+from);
  html=html.split(from).join(to);
 }
 if(html.split(recapFeature).length!==2)throw Error('Recap feature photo changed; review headshot sizing');
 html=html.replace(recapFeature,()=>'aria-label="Open ${esc(p.name)} player card"><img src="${esc(hjEspnFullImg(photo))}"');
 if(html.split(viewportMeta).length!==2)throw Error('Viewport meta changed; review ESPN image helper');
 html=html.replace(viewportMeta,()=>viewportMeta+'\n'+helper);
 if(html.includes(FULL+'${'))throw Error('Unsized headshot template remains');
 const start=html.indexOf('const HJ_STATUS_LIVE=new Map();'),end=html.indexOf('</script>',start);
 if(start<0||end<0)throw Error('Injury runtime anchor missing');
 return html.slice(0,start)+injuryRuntime+html.slice(end);
}
