// Source guard: challenge touch/trackpad controllers must not return.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await fs.readFile('scripts/challenge-live.js','utf8');
assert(!source.includes('function ownsGesture'));
assert(!source.includes('hjTrackpadScroll'));
console.log('PASS challenges delegate scrolling to the shared matchup rail');
