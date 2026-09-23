import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const root=process.argv[2]||'_site';
const publicURL=process.argv[3];
const expectedIcons=new Map([
 ['apple-touch-icon-hung-jurors-v1.png',180],
 ['apple-touch-icon.png',180],
 ['apple-touch-icon-precomposed.png',180],
 ['hung-jurors-icon-192-v1.png',192],
 ['icon-192.png',192],
 ['hung-jurors-icon-512-v1.png',512],
 ['icon-512.png',512]
]);
const local=async file=>readFile(path.join(root,file));
async function published(file,type){
 const url=new URL(file,publicURL);
 // Check the exact icon URLs Safari requests; don't mask stale responses with cache busters.
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200,url.href+' must return 200');
 assert.match(response.headers.get('content-type')||'',type,url.href+' content type');
 return Buffer.from(await response.arrayBuffer());
}
const html=publicURL?(await published('/?app-icon-check='+Date.now(),/text\/html/)).toString():await readFile(path.join(root,'index.html'),'utf8');
const head=html.match(/<head>[^]*?<\/head>/)?.[0];
assert(head,'Document head must exist');
const links=[...head.matchAll(/<link\b[^>]*>/g)].map(([tag])=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));
const apple=links.filter(x=>x.rel==='apple-touch-icon');
assert.equal(apple.length,1,'One unambiguous Apple icon');
assert.equal(apple[0].href,'/apple-touch-icon-hung-jurors-v1.png');
assert.equal(apple[0].sizes,'180x180');
const manifests=links.filter(x=>x.rel==='manifest');
assert.equal(manifests.length,1);
assert.equal(manifests[0].href,'/site.webmanifest?v=hung-jurors-logo-v1');
const manifest=JSON.parse(publicURL?(await published(manifests[0].href,/application\/(?:manifest\+)?json/)).toString():await local('site.webmanifest'));
assert.equal(manifest.name,'The Hung Jurors');
assert.equal(manifest.id,'/');
assert.equal(manifest.start_url,'/');
assert.equal(manifest.scope,'/');
assert.equal(manifest.display,'standalone');
assert.deepEqual(manifest.icons.map(i=>i.sizes).sort(),['192x192','512x512']);
for(const item of [...links.filter(x=>x.rel==='icon'||x.rel==='apple-touch-icon'),...manifest.icons]){
 const name=new URL(item.href||item.src,'https://hungjurors.com').pathname.slice(1);
 assert(expectedIcons.has(name),'Unknown or missing icon: '+name);
 assert.equal(item.sizes,expectedIcons.get(name)+'x'+expectedIcons.get(name));
 if(item.src){assert.equal(item.type,'image/png');assert.equal(item.purpose,'any');}
}
const buffers=new Map();
for(const [file,size] of expectedIcons){
 const bytes=await local(file);
 assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]),file+' PNG signature');
 assert.equal(bytes.toString('ascii',12,16),'IHDR');
 assert.equal(bytes.readUInt32BE(16),size,file+' width');
 assert.equal(bytes.readUInt32BE(20),size,file+' height');
 assert.equal(bytes[25],2,file+' must be opaque RGB');
 if(publicURL)assert.deepEqual(await published('/'+file,/image\/png/),bytes,file+' must match deployed logo bytes');
 buffers.set(file,bytes);
 console.log('PASS '+(publicURL?'Published ':'Staged ')+file+' '+size+'x'+size);
}
for(const [alias,target] of [
 ['apple-touch-icon.png','apple-touch-icon-hung-jurors-v1.png'],
 ['apple-touch-icon-precomposed.png','apple-touch-icon-hung-jurors-v1.png'],
 ['icon-192.png','hung-jurors-icon-192-v1.png'],
 ['icon-512.png','hung-jurors-icon-512-v1.png']
])assert.deepEqual(buffers.get(alias),buffers.get(target),alias);
console.log('PASS '+(publicURL?'Published':'Staged')+' Apple icon declaration and web app manifest');
