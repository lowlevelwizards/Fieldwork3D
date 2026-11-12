import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ShotVisualPool} from '../src/rendering/breach-shot-visual-pool.ts';

test('P2.6 combat impact pool reuses only matching material/surface styles',()=>{
 const pool=new ShotVisualPool(3);
 let made=0;const create=()=>({id:++made});
 const blood=pool.acquire('red|blood',create);
 pool.release('red|blood',blood,()=>{throw Error('unexpected dispose');});
 assert.equal(pool.spareCount,1);
 assert.equal(pool.acquire('red|blood',create),blood);
 assert.equal(made,1,'subsequent actual shots reuse visual geometry');
 pool.release('red|blood',blood,()=>{});
 const glass=pool.acquire('red|glass',create);
 const blue=pool.acquire('blue|blood',create);
 assert.notEqual(glass,blood,'glass cannot inherit blood material');
 assert.notEqual(blue,blood,'enemy and friendly tracers retain authored colors');
 assert.equal(made,3);
});
test('P2.6 bounded shot pool retires excess meshes and resets sites',()=>{
 const pool=new ShotVisualPool(2),disposed=[];
 const a={id:1},b={id:2},c={id:3};
 const dispose=x=>disposed.push(x.id);
 pool.release('blue|wood',a,dispose);
 pool.release('red|dust',b,dispose);
 pool.release('red|metal',c,dispose);
 assert.deepEqual(disposed,[3]);
 assert.equal(pool.spareCount,2);
 pool.clear(dispose);
 assert.equal(pool.spareCount,0);
 assert.deepEqual(disposed.sort(),[1,2,3]);
});
test('P2.6 scene recycles rendered shot meshes without authoring impacts',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(source,/this\.shotEffectPool\.acquire\(style,\(\)=>\{/);
 assert.match(source,/this\.shotEffectPool\.release\(effect\.style,effect/);
 assert.match(source,/this\.shotEffectPool\.clear\(effect=>\{/);
 assert.match(source,/const style=shot\.side\+'\|'\+\(shot\.surface\?\?'dust'\)/);
 assert.match(source,/if\(!visibility\.flash&&!visibility\.trace&&!visibility\.impact\)continue/);
 assert.match(source,/this\.effectCache\.set\(shot\.id,effect\)/);
});
