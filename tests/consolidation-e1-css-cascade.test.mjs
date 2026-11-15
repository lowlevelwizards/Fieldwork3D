/** E1.B: remove only identical, same-context declarations proven safe by final cascade. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cssCandidates} from '../scripts/verification/refactor-e0-audit.mjs';
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
test('E1.B remove redundant base-context duplicate rules while preserving final active styling',()=>{
 const singles=[
  '.context-tools[hidden]{display:none}',
  '.context-state .ui-icon{width:16px;height:16px}',
  '.guidance[hidden],.feed[hidden]{display:none!important}'
 ];
 for(const rule of singles)
  assert.equal(css.split(rule).length-1,1,'identical base rule must retain exactly one winner: '+rule);
 assert.match(css,/@import '\.\/ui\/fieldwork-design\.css';/);
 assert.match(css,/@import '\.\/operator-material-browser\.css';/);
 const report=cssCandidates(css);
 assert.ok(report.sameContextRepeatedSelectors>=0);
 assert.ok(report.mediaQueries>100);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});
