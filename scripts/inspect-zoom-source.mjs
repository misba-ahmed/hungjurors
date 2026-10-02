import fs from 'node:fs/promises';
await fs.mkdir('.zoom',{recursive:true});
const html=await fs.readFile('index.html','utf8');
const clean=s=>s.replace(/data:[^"'\s<>]+;base64,[A-Za-z0-9+/=]+/g,'[embedded-image]').replace(/(["'])[A-Za-z0-9+/=]{1000,}\1/g,'"[base64]"');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>({attributes:m[1],text:clean(m[2])}));
await fs.writeFile('.zoom/source.json',JSON.stringify(scripts.filter(s=>/canvas|visualViewport|ResizeObserver|location.reload|gesturestart|lms-zoom/.test(s.text)),null,2));
