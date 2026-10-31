import test from 'node:test';
import assert from 'node:assert/strict';
import {bootOutlineClearance,gaitFootDiagnostic,projectedBootHalfWidth,
  BOOT_WIDTH} from '../src/breach-gait-geometry.ts';
const shoe=(x,y,yaw=0)=>({position:{x,y},worldYaw:yaw});
test('rotated boot silhouettes detect real intersections, not just center spacing',()=>{
 assert.ok(bootOutlineClearance(shoe(0,0),shoe(0,3.5))<0);
 assert.ok(bootOutlineClearance(shoe(0,0),shoe(0,7))>0);
 assert.ok(bootOutlineClearance(shoe(0,0),shoe(12,0))>0);
 assert.ok(projectedBootHalfWidth(0,0)>=BOOT_WIDTH/2);
 assert.ok(projectedBootHalfWidth(Math.PI/2,0)>BOOT_WIDTH/2);
});
test('diagnostics never mutate either contact',()=>{
 const feet=[shoe(0,-5.6),shoe(0,5.6)];
 const original=JSON.stringify(feet);
 const quality=gaitFootDiagnostic(feet,0);
 assert.ok(quality.outlineClearance>0);
 assert.equal(JSON.stringify(feet),original);
});
