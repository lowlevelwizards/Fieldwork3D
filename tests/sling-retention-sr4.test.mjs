import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
test('SR4 only authored open front branches accept narrow ribbon entry',()=>{
 for(const rig of ['no-rig','chest-placard']){
  const f=equipmentExterior('plate-jpc',rig,'combat-shirt');
  const left=f.slingShoulder(-1,.78),right=f.slingShoulder(1,.78);
  assert.equal(left.kind,'open-branch');assert.equal(right.kind,'open-branch');
  assert.equal(left.frontEntry[2],-right.frontEntry[2]);
  assert.equal(f.slingShoulder(-1,1.05).kind,'outside');
 }
 for(const [a,r] of [['plate-jpc','full-chest'],['plate-heavy','no-rig'],['armor-bare','light-rig']])
  assert.equal(equipmentExterior(a,r,'combat-shirt').slingShoulder(1,.78).kind,'outside');
});
