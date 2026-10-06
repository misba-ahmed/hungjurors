import fs from 'node:fs';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);execFileSync('git',['worktree','add','--detach','/tmp/matchup-fix','origin/main']);
for(const [from,to]of [['history.js','scripts/matchup-history.js'],['prepare.mjs','scripts/prepare-site.mjs'],['tests.mjs','scripts/test-matchup-history.mjs']])fs.copyFileSync('.mascot-fix/matchup-'+from,'/tmp/matchup-fix/'+to);
const logs=execFileSync('node',['--test','scripts/test-matchup-week.mjs','scripts/test-matchup-history.mjs'],{cwd:'/tmp/matchup-fix',encoding:'utf8'});
execFileSync('node',['scripts/prepare-site.mjs','index.html'],{cwd:'/tmp/matchup-fix',stdio:'inherit'});
fs.writeFileSync('.mascot-fix/matchup-result.json',JSON.stringify({passed:true,logs}));
