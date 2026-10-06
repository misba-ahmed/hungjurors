import fs from'node:fs';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);execFileSync('git',['worktree','add','--detach','/tmp/roster-fix','origin/main']);
fs.copyFileSync('.mascot-fix/refresh-matchup-history.mjs','/tmp/roster-fix/refresh.mjs');execFileSync('node',['refresh.mjs'],{cwd:'/tmp/roster-fix',stdio:'inherit'});fs.copyFileSync('/tmp/roster-fix/data/matchup-history.json','.mascot-fix/verified-matchup-history.json');
