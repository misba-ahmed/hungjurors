import fs from 'node:fs';
try { await import('./week-check.mjs'); } catch(e) { fs.writeFileSync('.mascot-fix/week-error.json',JSON.stringify({error:String(e),stack:e.stack})); }
