import fs from 'node:fs';
try { await import('./track-check.mjs'); } catch(e) { fs.writeFileSync('.mascot-fix/track-error.json',JSON.stringify({error:String(e),stack:e.stack})); }
