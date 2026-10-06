import fs from 'node:fs/promises';
const response=await fetch('https://hungjurors.com/?header-check='+Date.now(),{cache:'no-store'}),html=await response.text();
const url=html.match(/src=["']([^"']*manager-hero[^"']*)/)[1];
const r=await fetch(new URL(url,'https://hungjurors.com/'),{cache:'no-store'}),s=await r.text();
await fs.writeFile('.mascot-fix/live-header-check.json',JSON.stringify({url,trophy:s.includes("managers-champion"),cacheControl:r.headers.get('cache-control'),script:s},null,2));
