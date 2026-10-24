import test from 'node:test';
import assert from 'node:assert/strict';

test('twin-stick right input produces a distinct aim/fire intent', async()=>{
 const {stickAxis,isFireIntent,screenToGround}=await import('../src/input/control-math.ts');
 const neutral=stickAxis(0,0);
 assert.equal(isFireIntent(neutral),false);
 assert.equal(isFireIntent(stickAxis(8,0)),false);
 const full=stickAxis(54,0);
 assert.equal(isFireIntent(full),true);
 const aim=screenToGround(full,Math.PI/4);
 assert.ok(Math.hypot(aim.x,aim.z)>.9);
});
