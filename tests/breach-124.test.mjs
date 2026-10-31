import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const P=(x,y,z)=>new THREE.Vector3(x,y,z);
test('124: stock-to-shoulder fit retains both grips through strafe yaw',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun'])
  for(const handling of ['low','high','point','ads','short'])
   for(const yaw of [-1.1,-.7,-.35,0,.35,.7,1.1]){
    const fit=fitWeaponPose({weapon,handling,yaw,recoil:0});
    // Beyond roughly 20 degrees across the torso, keeping the buttplate
    // on the outside shoulder can make a simultaneous two-hand fit
    // anatomically impossible. Never bury the stock to fake a zero error.
    assert.ok(fit.stock.z>=8.15);
    assert.ok(Number.isFinite(fit.contactError));
    assert.ok(fit.stockError<3);
    if(Math.abs(yaw)<=.35){
      assert.ok(fit.twoHanded,
        weapon+' '+handling+' yaw '+yaw+' unreachable: '+fit.contactError);
      assert.ok(fit.contactError<.01);
      assert.ok(fit.primary.distanceTo(P(1,4,7))<=19.93001);
      assert.ok(fit.support.distanceTo(P(1,4,-7))<=19.93001);
    }
   }
});
test('124: all gun types maintain visual support + firing-hand contact',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const weapon of ['carbine','smg','rifle','shotgun'])
  for(const direction of [-1,1]){
   for(let i=0;i<150;i++){
    const t=i/60,z=direction*t*24;
    rig.root.position.set(0,0,z);
    poseOperator(rig,{x:0,z,heading:0,travelYaw:direction*Math.PI/2,
      velocity:24,seconds:t,stride:t*40,posture:'stand',injury:0,
      weapon,reload:0,reloadDuration:1.8,lastThrowAt:-100,
      lastDoorAt:-100,down:false,surrender:false,aiming:true,
      firing:false,turning:0,aimBlend:1,shotHeading:0},1/60);
    rig.root.updateMatrixWorld(true);
    const grips=weaponGrips(weapon);
    const actualSupport=rig.weapon.localToWorld(P(grips.supportX,
      grips.supportY,-1.6));
    const actualPrimary=rig.weapon.localToWorld(P(grips.primaryX,
      grips.primaryY,1.8));
    const support=rig.arms[0].hand.getWorldPosition(new THREE.Vector3());
    const primary=rig.arms[1].hand.getWorldPosition(new THREE.Vector3());
    assert.ok(support.distanceTo(actualSupport)<.015,
      'support detached '+weapon+' '+direction+' '+i);
    assert.ok(primary.distanceTo(actualPrimary)<.015,
      'firing detached '+weapon+' '+direction+' '+i);
   }
  }
 rig.dispose();
});
