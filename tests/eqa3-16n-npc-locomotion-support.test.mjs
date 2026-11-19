import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NPC_LAB_POSES,NpcLabPreview,NpcLabFootFilm,
 sampleNpcCivilian,sampleNpcHostile} from '../src/operator-lab-npc-poses.ts';
import {npcLocomotionSupport} from '../src/breach-npc-locomotion-support.ts';
import {LEG_ANKLE_HEIGHT,horizontalLegReach,LEG_HIP_SIDE}
 from '../src/breach-leg-geometry.ts';

const world=(node,at=[0,0,0])=>{
 node.updateWorldMatrix(true,false);
 return new THREE.Vector3(...at).applyMatrix4(node.matrixWorld);
};
const near=(a,b,tol=.02)=>Math.abs(a-b)<=tol;

test('N1: actual Lab locomotion path speed equals motor velocity, including after 2.5s',()=>{
 for(const [id,a,b] of [
  ['civ-walk',1.13,1.14],['civ-walk',3.13,3.14],
  ['civ-flee',1.36,1.37],['civ-flee',1.67,1.68],
  ['civ-hide-walk',2.11,2.12],['civ-follow',2.28,2.29],
  ['civ-escorted',3.10,3.11]
 ]){
  const left=sampleNpcCivilian(id,a),right=sampleNpcCivilian(id,b);
  const travel=(right.p.x-left.p.x)/(b-a);
  assert.ok(near(travel,right.velocity,.001),
   id+' world travel '+travel+' must equal reported '+right.velocity);
 }
 const hostileA=sampleNpcHostile('host-retreat',1.37).pose;
 const hostileB=sampleNpcHostile('host-retreat',1.38).pose;
 assert.ok(near((hostileB.x-hostileA.x)/.01,hostileB.velocity,.001));
});

test('N2: support shift follows the bearing shoe, bounded, inactive at rest',()=>{
 const foot=(x,contact=true)=>({position:{x,y:0},height:0,
  worldYaw:0,phase:'planted',contact});
 const ahead=npcLocomotionSupport({x:0,y:0},0,26,
  [foot(6),foot(8)],true);
 assert.ok(ahead.pelvisForward>1&&ahead.pelvisForward<=2.2);
 assert.ok(ahead.chestForward>ahead.pelvisForward);
 const behind=npcLocomotionSupport({x:0,y:0},0,66,
  [foot(-18),foot(-8)],true);
 assert.ok(behind.pelvisForward>=-.6);
 const idle=npcLocomotionSupport({x:0,y:0},0,26,
  [foot(6),foot(8)],false);
 assert.deepEqual(idle,{pelvisForward:0,chestForward:0});
});

test('N3: all screenshot walk/flee poses have centered stage, planted shoes and connected weight-bearing legs',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  for(const [id,at] of [
   ['civ-walk',1.14],['civ-flee',1.37],['civ-flee',1.68],
   ['civ-hide-walk',2.12],['civ-follow',2.29],
   ['civ-escorted',3.5],['civ-injured-walk',1.9]
  ]){
   lab.render(id,at);
   const c=sampleNpcCivilian(id,at);
   const rig=lab.civilian.character;
   const footTargets=new NpcLabFootFilm(id).sample(at);
   assert.ok(near(rig.root.position.x,c.p.x,.0001),
    id+' internal root still follows recorded motor');
   assert.ok(near(world(rig.root).x,0,.02),
    id+' stage follows locomotion, not a slowed motor');
   const pelvis=world(rig.hip);
   const bearing=footTargets.filter(f=>f.contact);
   assert.ok(bearing.length>0,id+' must have a physical support foot');
   const nearest=Math.min(...bearing.map(f=>Math.abs(f.position.x-c.p.x-pelvis.x)));
   assert.ok(nearest<horizontalLegReach()+LEG_HIP_SIDE+2,
    id+' center of mass must remain above reachable support: '+nearest);
   for(let i=0;i<2;i++){
    const foot=rig.feet[i],shoe=world(foot.shoe);
    const thighEnd=world(foot.upper,[0,.5,0]);
    const shinStart=world(foot.lower,[0,-.5,0]);
    const shinEnd=world(foot.lower,[0,.5,0]);
    assert.ok(thighEnd.distanceTo(shinStart)<.20,
     id+' '+at+' thigh/shin must join at knee');
    assert.ok(shinEnd.distanceTo(shoe)<.8,
     id+' '+at+' shin/boot must join at ankle');
    if(footTargets[i].contact)
     assert.ok(Math.abs(shoe.y-LEG_ANKLE_HEIGHT)<.32,
      id+' '+at+' planted boot must remain on ground');
   }
  }
 }finally{lab.dispose();}
});
test('N4: original 36 NPC Lab tracks still seek and render without invalid joints',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  for(const item of NPC_LAB_POSES)
   for(const at of [.02,.8,1.14,1.37,1.68,2.5,3.8]){
    const frame=lab.render(item.id,at);
    const rig=frame.model==='civilian'?lab.civilian.character:lab.hostile;
    assert.ok(Number.isFinite(world(rig.root).x),item.id+' root');
    for(const leg of rig.feet){
     assert.ok(Number.isFinite(world(leg.shoe).y),item.id+' boot');
     assert.ok(leg.outOfReach===false||typeof leg.outOfReach==='boolean');
    }
   }
 }finally{lab.dispose();}
});
