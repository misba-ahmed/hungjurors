import sharp from 'sharp';import fs from 'node:fs/promises';
for(const [name,url] of [
['captain','https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/buccaneers/lyajlpzfhp9mny0ksptx.jpg'],
['freddie-full','https://static.clubs.nfl.com/image/upload/t_new_photo_album/falcons/tanksq6y5kiedrajreqn.jpg']]){
const r=await fetch(url);if(!r.ok)throw Error(r.status);await sharp(Buffer.from(await r.arrayBuffer())).resize({width:1000,height:1000,fit:'inside'}).jpeg({quality:90}).toFile('.mascot-fix/'+name+'.jpg');}
