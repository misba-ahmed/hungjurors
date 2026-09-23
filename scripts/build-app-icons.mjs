// Regenerate with: npm install --no-save --package-lock=false sharp@0.34.5
// Then: node scripts/build-app-icons.mjs (or --check to compare committed images).
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const source=await readFile('index.html','utf8');
const logo=source.match(/<div class="hero"><div class="hero-in"><img class="logo" src="data:image\/png;base64,([^"]+)"/);
assert(logo,'The homepage hero logo must exist');
const original=Buffer.from(logo[1],'base64');
const background='#F7F3E8';
const specs=[
 [180,'apple-touch-icon-hung-jurors-v1.png',['apple-touch-icon.png','apple-touch-icon-precomposed.png']],
 [192,'hung-jurors-icon-192-v1.png',['icon-192.png']],
 [512,'hung-jurors-icon-512-v1.png',['icon-512.png']]
];
for(const [size,name,aliases] of specs){
 const png=await sharp(original).resize(size,size,{fit:'contain',background}).flatten({background}).removeAlpha().png().toBuffer();
 const metadata=await sharp(png).metadata();
 assert.equal(metadata.width,size);
 assert.equal(metadata.height,size);
 assert.equal(metadata.hasAlpha,false);
 for(const file of [name,...aliases]){
  if(process.argv.includes('--check'))assert.deepEqual(await readFile(file),png,file+' must match the homepage logo');
  else await writeFile(file,png);
 }
 console.log('Verified homepage logo: '+name+' ('+size+' × '+size+', opaque PNG)');
}
