import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_IMPACT_PROFILES,MATERIAL_IMPACT_PARTICLE_LIMIT,sampleMaterialImpact} from '../src/rendering/breach-material-impact-atom.ts';
const scratch=()=>({x:0,y:0,z:0,yaw:0,roll:0,pitch:0,width:0,length:0,opacity:0,color:0});
test('V5 profile counts, deterministic replay and finite bounded visual positions',()=>{
 for(const [surface,p] of Object.entries(MATERIAL_IMPACT_PROFILES)){
  assert.ok(p.count<=MATERIAL_IMPACT_PARTICLE_LIMIT/20);
  for(let i=0;i<p.count;i++){
   const a=scratch(),b=scratch();
   assert.equal(sampleMaterialImpact(surface,29,i,.1,10,12,20,a),true);
   sampleMaterialImpact(surface,29,i,.01,10,12,20,b);
   sampleMaterialImpact(surface,29,i,.1,10,12,20,b);
   assert.deepEqual(a,b);assert.ok(Object.values(a).every(Number.isFinite));
   assert.ok(a.y>=.9&&a.opacity>0&&a.opacity<=1);
   assert.ok(Math.hypot(a.x-10,a.z-20)<15);
  }
  assert.equal(sampleMaterialImpact(surface,29,p.count,.1,0,0,0,scratch()),false);
  assert.equal(sampleMaterialImpact(surface,29,0,p.life,0,0,0,scratch()),false);
  assert.equal(sampleMaterialImpact(surface,29,0,-1,0,0,0,scratch()),false);
 }
});
test('V5 distinct metal/wood/stone/glass/dust visual profiles',()=>{
 const a=scratch(),b=scratch();
 sampleMaterialImpact('metal',1,0,.1,0,10,0,a);
 sampleMaterialImpact('wood',1,0,.1,0,10,0,b);
 assert.ok(a.width<b.width);assert.notEqual(a.color,b.color);
 sampleMaterialImpact('dust',1,0,.1,0,10,0,a);
 sampleMaterialImpact('stone',1,0,.1,0,10,0,b);
 assert.ok(a.width>b.width);assert.ok(a.opacity<b.opacity);
});
