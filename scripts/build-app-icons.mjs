// Render the original crest as a clean, scalable app icon.
// npm install --no-save --package-lock=false sharp@0.34.5 potrace@2.1.8
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import potrace from 'potrace';
const source=await readFile('index.html','utf8');
const logo=source.match(/<div class="hero">\s*<div class="hero-in">\s*<img class="logo" src="data:image\/png;base64,([^"]+)"/);
assert(logo,'The original homepage logo must exist');
const original=Buffer.from(logo[1],'base64');
const meta=await sharp(original).metadata();
assert(meta.hasAlpha,'The original logo must have a transparent background');
// The shield ends above the lettering. Trace only that original artwork;
// no screenshot, replacement illustration, or wordmark enters the icon.
const crest=await sharp(original).extract({left:0,top:0,width:meta.width,height:Math.floor(meta.height*.62)}).trim().png().toBuffer();
const mask=await sharp(crest).extractChannel('alpha').negate().png().toBuffer();
const svg=await new Promise((resolve,reject)=>potrace.trace(mask,{color:'#D9A93F',background:'transparent',threshold:128,turdSize:0,optTolerance:.15},(error,value)=>error?reject(error):resolve(value)));
const box=await sharp(crest).metadata(),height=512*.76,width=height*box.width/box.height;
const paths=svg.match(/<path\b[^]*?<\/svg>/)[0].replace(/<\/svg>$/,'');
const icon='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#14324F"/><g transform="translate('+((512-width)/2)+' '+((512-height)/2)+') scale('+(height/box.height)+')">'+paths+'</g></svg>';
await mkdir('assets/brand',{recursive:true});
if(process.argv.includes('--check'))assert.equal(await readFile('assets/brand/hung-jurors-app-icon.svg','utf8'),icon);
else await writeFile('assets/brand/hung-jurors-app-icon.svg',icon);
for(const [size,name,aliases] of [
 [180,'apple-touch-icon-hung-jurors-v2.png',['apple-touch-icon.png','apple-touch-icon-precomposed.png']],
 [192,'hung-jurors-icon-192-v2.png',['icon-192.png']],
 [512,'hung-jurors-icon-512-v2.png',['icon-512.png']]
]){
 const png=await sharp(Buffer.from(icon),{density:288}).resize(size,size).flatten({background:'#14324F'}).removeAlpha().png().toBuffer();
 const metadata=await sharp(png).metadata();
 assert.equal(metadata.width,size);assert.equal(metadata.height,size);assert.equal(metadata.hasAlpha,false);
 for(const file of [name,...aliases]){
  if(process.argv.includes('--check'))assert.deepEqual(await readFile(file),png,file+' must match the gold crest icon');
  else await writeFile(file,png);
 }
 console.log('Verified gold crest icon: '+name+' ('+size+' × '+size+', opaque PNG)');
}
