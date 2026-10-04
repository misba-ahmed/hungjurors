import fs from 'node:fs';import sharp from 'sharp';
for(const [key,name] of [['packers','Green_Bay_Packers_wordmark.svg'],['patriots','New_England_Patriots_wordmark.svg']]){
const html=await(await fetch('https://commons.wikimedia.org/wiki/File:'+name)).text();
const urls=[...html.matchAll(/https:\/\/upload.wikimedia.org\/wikipedia\/commons\/[^"<> ]+\.svg/g)].map(x=>x[0]);
if(!urls.length)throw Error('No SVG '+name);
const svg=await(await fetch(urls[0])).text();fs.writeFileSync('.mascot-fix/'+key+'-wordmark.svg',svg);
console.log(key,svg.slice(0,800));
await sharp(Buffer.from(svg)).resize({width:600}).png().toFile('.mascot-fix/'+key+'-wordmark.png');
}