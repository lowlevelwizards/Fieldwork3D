import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {BOOT_LENGTH,BOOT_FOREFOOT_OFFSET,bootOutlineClearance}
 from '../src/breach-gait-geometry.ts';

const near=(actual,wanted,message)=>assert.ok(
 Math.abs(actual-wanted)<1e-4,
 message+': '+actual+' != '+wanted);

test('boot mesh extends mostly forward of its ankle while keeping the ankle pivot at zero',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const foot of rig.feet){
  const box=foot.shoe.geometry;
  box.computeBoundingBox();
  const min=box.boundingBox.min.x,max=box.boundingBox.max.x;
  near(max,BOOT_LENGTH/2+BOOT_FOREFOOT_OFFSET,'toe projection');
  near(min,-BOOT_LENGTH/2+BOOT_FOREFOOT_OFFSET,'heel projection');
  assert.ok(max>2*Math.abs(min),'visually clear toe-forward silhouette');
  near(foot.shoe.position.x,0,'unmoved ankle pivot');
 }
 rig.dispose();
});

test('feet project toe-forward in every facing direction, while planted anchor does not move',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const lateral={x:-Math.sin(heading),y:Math.cos(heading)};
  const targets=[-5.6,5.6].map(s=>({
    position:{x:lateral.x*s,y:lateral.y*s},
    height:0,worldYaw:-heading,phase:'planted',
    contact:true,progress:0,pitch:0
  }));
  rig.root.position.set(0,0,0);
  poseOperator(rig,{
   x:0,z:0,heading,travelYaw:heading,velocity:0,seconds:1,
   stride:0,posture:'stand',injury:0,weapon:'carbine',
   reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   deterministic:true,replayFeet:targets,pelvisYaw:-heading,
   shotHeading:heading,aimBlend:0
  },0);
  rig.root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const foot=rig.feet[i];
   const pivot=foot.shoe.getWorldPosition(new THREE.Vector3());
   near(pivot.x,targets[i].position.x,'contact anchor X');
   near(pivot.z,targets[i].position.y,'contact anchor Z');
   const front=foot.shoe.localToWorld(new THREE.Vector3(
     BOOT_LENGTH/2+BOOT_FOREFOOT_OFFSET,0,0));
   const rear=foot.shoe.localToWorld(new THREE.Vector3(
     -BOOT_LENGTH/2+BOOT_FOREFOOT_OFFSET,0,0));
   const project=point=>(point.x-pivot.x)*Math.cos(heading)+
     (point.z-pivot.z)*Math.sin(heading);
   assert.ok(project(front)>5,'toe must point with operator heading');
   assert.ok(project(rear)<-2,'heel remains behind ankle');
   assert.ok(project(front)>Math.abs(project(rear))*2,
     'toe should extend distinctly farther than heel');
  }
 }
 rig.dispose();
});

test('oriented boot collision checks include translated toe footprint',()=>{
 // Facing inward, the forward-shifted toes collide before the
 // older centered-box approximation would have registered contact.
 const rear={position:{x:0,y:0},worldYaw:0};
 const forward={position:{x:9,y:0},worldYaw:Math.PI};
 assert.ok(bootOutlineClearance(rear,forward)<0,
   'two approaching toe boxes must be recognized as overlapping');
 // Parallel boots keep their old safe lateral spacing.
 assert.ok(bootOutlineClearance(rear,
   {position:{x:0,y:8},worldYaw:0})>0);
});
