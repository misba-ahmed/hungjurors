import fs from 'node:fs';
try { await import('./scroll-check.mjs'); } catch(e) { fs.writeFileSync('.mascot-fix/scroll-error.json',JSON.stringify({error:String(e),stack:e.stack})); }
