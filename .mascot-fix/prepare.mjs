import sharp from 'sharp';import fs from 'node:fs/promises';
await fs.mkdir('.mascot-fix',{recursive:true});
const refs=[
['raider','https://static.clubs.nfl.com/image/upload/t_new_photo_album/raiders/cqrazg9i1tkurxhiefch.jpg'],
['freddie','https://static.clubs.nfl.com/image/private/f_auto/falcons/n2cdwkp8u7gvpvbr13vb'],
['captain','https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/buccaneers/k6ftoypn3v16lbbghfls.jpg']];
for(const [name,url] of refs){const r=await fetch(url);if(!r.ok)throw Error(name+':'+r.status);const buf=Buffer.from(await r.arrayBuffer());await sharp(buf).resize({width:1000,height:1000,fit:'inside'}).jpeg({quality:88}).toFile('.mascot-fix/'+name+'.jpg');}
