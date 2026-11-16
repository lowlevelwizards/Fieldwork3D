import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
const rigCode=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');

test('E6.7 creates final garment cut mesh directly, without disposable throwaway',()=>{
 const start=rigCode.indexOf('function bone('),end=rigCode.indexOf('export function createOperatorRig',start);
 assert.ok(start>=0&&end>start);
 const code=rigCode.slice(start,end);
 assert.doesNotMatch(code,/block\(parent,0,0,0,w,1,depth,m\)/);
 assert.doesNotMatch(code,/old\.dispose\(\)/);
 assert.match(code,/new THREE\.Mesh\(shapes\.full,m\)/);
 assert.match(code,/mesh\.castShadow=true;mesh\.receiveShadow=true;/);
 assert.match(code,/parent\.add\(mesh\)/);
 assert.match(code,/garmentSegmentGeometries=shapes/);
});
test('E6.7 preserves segment cuts and rig-owned editable geometry',()=>{
 const r=createOperatorRig('e6-rig-contract','blue',true);
 try{
  const cuts=[];
  r.root.traverse(node=>{
   const shapes=node.userData.garmentSegmentGeometries;
   if(shapes)cuts.push({node,shapes});
  });
  assert.ok(cuts.length>=6);
  for(const {node,shapes} of cuts){
   assert.equal(node.geometry,shapes.full);
   for(const name of ['full','bloused','cuffed']){
    const geo=shapes[name];
    assert.ok(geo.getAttribute('position'));
    assert.ok(geo.getAttribute('uv'));
   }
   assert.equal(node.castShadow,true);
   assert.equal(node.receiveShadow,true);
   assert.equal(node.position.length(),0);
  }
  poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,
   stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,
   reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   deterministic:true},0);
  assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
  assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
 }finally{r.dispose();}
});
