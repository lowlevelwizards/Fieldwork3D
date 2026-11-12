import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PresentationSightMemo} from '../src/rendering/breach-presentation-sight-memo.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('P1.3 opt-in overlay reports presentation sight cost without altering simulation',()=>{
 const scene=source('src/breach-3d.ts'),loop=source('src/breach-runtime-loop.ts');
 assert.match(scene,/presentationSight:this\.presentationSight\.stats\(\)/);
 assert.match(loop,/P1 VISIBLE Q\/H\/M\/B/);
 assert.match(loop,/P1 MISS D\/O\/DR\/I\/E/);
 assert.match(loop,/sight\.liveOcclusionProbes/);
 assert.match(loop,/m\.sceneUpdate\.toFixed\(1\)/);
});
test('P1.3 counters reset and source fallback is preserved',()=>{
 const m=new PresentationSightMemo(()=>true);
 assert.equal(m.stats().entries,0);
 m.query({},'effect','x',{x:0,y:0});
 assert.equal(m.stats().bypasses,1);
 m.reset();
 assert.equal(m.stats().queries,0);
 assert.match(source('src/breach-3d.ts'),/get\('presentationSight'\)!=='legacy'/);
});
