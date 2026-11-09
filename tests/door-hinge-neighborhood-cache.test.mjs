import test from 'node:test';
import assert from 'node:assert/strict';
import {COVER,activateSite,activeSite,activeGeometryRevision}
  from '../src/breach-core.ts';
import {cachedHingeSweepNeighborhood} from '../src/breach-door.ts';

test('static hinge neighborhoods are reused until structural geometry changes',()=>{
  const original=activeSite(),door={
    id:'cache-check',a:{x:120,y:120},b:{x:166,y:120},
    hinge:'a',swing:1,open:true,openFraction:0
  };
  try{
    const first=cachedHingeSweepNeighborhood(door);
    assert.strictEqual(first,cachedHingeSweepNeighborhood(door));
    const before=activeGeometryRevision();
    COVER.push({x:120,y:120,w:16,h:16,fixture:'cache-probe'});
    assert.ok(activeGeometryRevision()>before);
    const second=cachedHingeSweepNeighborhood(door);
    assert.notStrictEqual(first,second);
    assert.ok(second.cover.some(o=>o.fixture==='cache-probe'));
    assert.strictEqual(second,cachedHingeSweepNeighborhood(door));
    door.a.x+=8;
    const edited=cachedHingeSweepNeighborhood(door);
    assert.notStrictEqual(second,edited,'editing a lab hinge invalidates');
    assert.strictEqual(edited,cachedHingeSweepNeighborhood(door));
  }finally{
    activateSite(original);
  }
});
