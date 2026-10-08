import {createHash} from 'node:crypto';

// Keep the original PNG bytes; large CSS custom-property values are not
// consistently accepted by browsers. Emit ordinary cacheable image files.
export function extractSiteArtwork(source){
 const assets=new Map();
 const html=source.replace(/url\((["']?)(data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+))\1\)/g,(whole,quote,url,format,encoded)=>{
  if(url.length<128*1024)return whole;
  const bytes=Buffer.from(encoded,'base64');
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const path='assets/site-art/'+hash+'.'+(format==='jpeg'?'jpg':format);
  assets.set(path,bytes);
  return 'url("/'+path+'")';
 });
 return {html,assets};
}
