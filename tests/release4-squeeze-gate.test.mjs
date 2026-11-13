import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldEnterSqueeze} from '../src/breach-squeeze-gate.ts';
const base={fullBodyClear:false,narrowBodyClear:true,alreadySqueezing:false,
 closedDoor:false,doorAdvancing:false,leafMoving:false,
 nearNarrowThreshold:true,opposingPressure:false,traversalPending:false};
test('R4.4 true narrow traversal requires physical clearance evidence',()=>{
 assert.equal(shouldEnterSqueeze(base),true);
 assert.equal(shouldEnterSqueeze({...base,nearNarrowThreshold:false}),false);
 assert.equal(shouldEnterSqueeze({...base,nearNarrowThreshold:false,
  opposingPressure:true}),true);
 for(const blocker of ['fullBodyClear','closedDoor','doorAdvancing',
  'leafMoving','alreadySqueezing','traversalPending']){
  assert.equal(shouldEnterSqueeze({...base,[blocker]:true}),false,blocker);
 }
 assert.equal(shouldEnterSqueeze({...base,narrowBodyClear:false}),false);
 assert.equal(shouldEnterSqueeze({...base,traversalPending:true,
  settledPhysicalBlockage:true}),true,
  'settled physically passable jam may permit a real sideways profile');
 assert.equal(shouldEnterSqueeze({...base,traversalPending:true,
  settledPhysicalBlockage:true,doorAdvancing:true}),false,
  'never squeeze while the panel is actively yielding');
});
test('R4.4 live motor keeps existing squeeze physics and hinge authority',()=>{
 const source=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(source,/shouldEnterSqueeze\(\{/);
 assert.match(source,/doorAdvancing:!!doorContact\?\.advanced/);
 assert.match(source,/Math\.abs\(door\.angularVelocity\?\?0\)>\.08/);
 assert.match(source,/a\.squeeze=true;a\.squeezeYaw=sidewaysYaw/);
});
