import {createHash} from 'node:crypto';

// Keep the exact source bytes in shared, cacheable files. Large data URLs
// otherwise remain in HTML, script strings, DOM attributes and media buffers.
export function extractSiteArtwork(source){
 const assets=new Map();
 const html=source.replace(/data:(image\/(?:png|jpeg|webp)|video\/mp4);base64,([A-Za-z0-9+/=]+)/g,(url,mime,encoded)=>{
  if(url.length<128*1024)return url;
  const bytes=Buffer.from(encoded,'base64');
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const format=mime.split('/')[1];
  const path='assets/site-art/'+hash+'.'+(format==='jpeg'?'jpg':format);
  assets.set(path,bytes);
  return '/'+path;
 });
 return {html,assets};
}
