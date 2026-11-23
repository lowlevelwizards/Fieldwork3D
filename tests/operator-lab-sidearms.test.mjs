import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS,intersectsTorso}
 from '../src/breach-ik.ts';
import {ANATOMY} from '../src/breach-anatomy.ts';
import {GLOCK_APPEARANCE_REFERENCES}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {M9_APPEARANCE_REFERENCES}
 from '../src/weapons/geometry/beretta-m9-silhouettes.ts';
import {POSE_SIDEARM_GROUPS,poseSidearm,poseSidearmArtOnly,
 poseWeaponType,defaultPoseWeapon,POSE_ANIMATIONS}
 from '../src/operator-lab-pose-browser.ts';
import {LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {isLabPistolTrack,sampleLabPistolFrame,LAB_PISTOL_PREVIEW_SCALE}
 from '../src/operator-lab-pistol-tracks.ts';

import {secondaryUpperBodyTargets,LAB_CLOSE_RETENTION}
 from '../src/secondary-upper-body-pose.ts';
import {labPistolContacts} from '../src/operator-lab-pistol-contacts.ts';
import {glockArtSockets} from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {m9ArtSockets} from '../src/weapons/geometry/beretta-m9-silhouettes.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Operator Lab enumerates every real Glock and M9 art model, no invented pistols',()=>{
 const shown=POSE_SIDEARM_GROUPS.flatMap(group=>group.models.map(model=>model.id));
 const sourceModels=[...GLOCK_APPEARANCE_REFERENCES,...M9_APPEARANCE_REFERENCES]
  .map(model=>model.id);
 assert.deepEqual(shown,sourceModels);
 assert.equal(new Set(shown).size,shown.length);
 for(const id of shown){
  assert.equal(poseSidearm(id),id);
  assert.equal(poseWeaponType(id),'pistol');
 }
 assert.equal(poseSidearm('fake-pistol'),undefined);
 assert.equal(defaultPoseWeapon('pistol'),'glock-g19-gen3');
 for(const model of GLOCK_APPEARANCE_REFERENCES)
  assert.equal(poseSidearmArtOnly(model.id),false);
 for(const model of M9_APPEARANCE_REFERENCES)
  assert.equal(poseSidearmArtOnly(model.id),true);
});
test('All pistol motions share the ordinary selectable 4-second Lab clock',()=>{
 const names=['draw','holster','ready','high-ready','low-ready','aim','fire',
  'retention','reload','reload-emergency','reload-retention','reload-interrupt'];
 for(const name of names){
  const id='pistol-'+name;
  assert.ok(LAB_TRACKS.includes(id),id);
  assert.ok(POSE_ANIMATIONS.some(pose=>pose.id===id),id);
  assert.equal(isLabPistolTrack(id),true);
  for(const t of [0,.15,.5,.72,1,1.5,2,4]){
   const a=sampleLabPistolFrame(id,t);
   const b=sampleLabPistolFrame(id,t);
   assert.deepEqual(a,b,id+' deterministic seek '+t);
   assert.ok(a.fraction>=0&&a.fraction<=1,id);
   assert.ok(a.aim>=0&&a.aim<=1,id);
  }
 }
 assert.equal(sampleLabPistolFrame('pistol-draw',0).fraction,0);
 assert.equal(sampleLabPistolFrame('pistol-draw',2).fraction,1);
 assert.equal(sampleLabPistolFrame('pistol-holster',0).fraction,1);
 assert.equal(sampleLabPistolFrame('pistol-holster',2).fraction,0);
 assert.ok(sampleLabPistolFrame('pistol-high-ready',1).pitch>0);
 assert.ok(sampleLabPistolFrame('pistol-low-ready',1).pitch<0);
 assert.ok(sampleLabPistolFrame('pistol-fire',.36).recoil>0);
 assert.equal(sampleLabPistolFrame('pistol-reload-emergency',1).reload?.retain,false);
 assert.equal(sampleLabPistolFrame('pistol-reload-retention',1).reload?.retain,true);
 assert.equal(sampleLabPistolFrame('pistol-reload-interrupt',2).reload,null);
});
test('Ready tab actions move both real pistol wrists and muzzle distinctly',()=>{
 const frame=(name,t=2)=>sampleLabPistolFrame(name,t);
 assert.equal(frame('low-ready').stance,'low');
 assert.equal(frame('high-ready').stance,'high');
 assert.equal(frame('short-stock').stance,'retention');
 assert.equal(frame('active-aim').aim,1);
 assert.ok(frame('point-shoot').aim>.25&&frame('point-shoot').aim<.45);
 assert.ok(frame('ready-to-ads',.7).aim<frame('ready-to-ads',1.5).aim);
 assert.ok(frame('ads-to-low',.7).stanceBlend<
  frame('ads-to-low',1.5).stanceBlend);
 assert.ok(frame('low-ready').pitch<-.25&&frame('low-ready').pitch>-.4);
 assert.ok(frame('high-ready').pitch>.35&&frame('high-ready').pitch<.5);
 for(const kind of ['reload','reload-emergency','reload-retention'])
  assert.ok(frame(kind,1).reload,kind);
 // An interrupted reload must already have ended by 1.0 s, but its
 // pre-interruption phase is still real and seekable.
 assert.ok(frame('reload-interrupt',.6).reload);
 assert.equal(frame('reload-interrupt',1).reload,null);
 assert.equal(frame('reload-emergency',1).reload.retain,false);
 assert.equal(frame('reload-retention',1).reload.retain,true);
 assert.ok(LAB_PISTOL_PREVIEW_SCALE>.53&&LAB_PISTOL_PREVIEW_SCALE<.6);
 const target=(track,t=2)=>{
  const p=frame(track,t);
  return secondaryUpperBodyTargets({fraction:p.fraction,aim:p.aim,
   moving:false,obstructed:false,stance:p.stance,
   stanceBlend:p.stanceBlend});
 };
 const high=target('high-ready'),low=target('low-ready');
 const ready=target('ready'),ads=target('active-aim');
 const retention=target('short-stock');
 const point=target('point-shoot');
 assert.ok(ads.firing.y>high.firing.y+2,'ADS must be at eye height');
 assert.ok(high.firing.y>ready.firing.y+2,'high ready above normal ready');
 assert.ok(ready.firing.y>0,'normal ready above the sternum baseline');
 assert.ok(point.firing.y<ads.firing.y-2,
  'point shoot stays conspicuously lower than ADS');
 assert.ok(point.firing.x<ads.firing.x-2,'point shoot is not full ADS');
 assert.ok(high.firing.y-low.firing.y>5,'high/low firing wrist');
 assert.ok(high.support.y-low.support.y>5,'high/low support wrist');
 assert.ok(ads.firing.x-ready.firing.x>6.5,'ADS nearly straightens both arms');
 assert.ok(ads.firing.y-ready.firing.y>3.4,'ADS raises both hands');
 assert.ok(ready.firing.x-retention.firing.x>2,'retention retracts hands');
 assert.ok(retention.support.z<retention.firing.z-5,
  'close retention brings the free support hand back to the chest');
 // Return the support palm to the authored weapon instead of arbitrary
 // in-front-of-chest coordinates: every model has its own sockets.
 for(const ref of POSE_SIDEARM_GROUPS.flatMap(g=>g.models)){
  const sockets=ref.id.startsWith('glock-')?
   glockArtSockets(ref.id):m9ArtSockets(ref.id);
  const contact=labPistolContacts(ref.id);
  assert.equal(contact.primaryFromPivot.x,
   sockets.primaryGrip.x+1.05-sockets.holsterPivot.x,ref.id);
  assert.equal(contact.primaryFromPivot.y,
   sockets.primaryGrip.y+.72-sockets.holsterPivot.y,ref.id);
  const aimPose=sampleLabPistolFrame('active-aim',2);
  const both=secondaryUpperBodyTargets({
   fraction:1,aim:aimPose.aim,moving:false,obstructed:false,
   stance:aimPose.stance,labContacts:contact
  });
  assert.ok(Math.abs(both.support.y-both.firing.y)<1.5,ref.id);
  assert.ok(both.firing.x>17,ref.id);
  assert.ok(both.support.x-both.firing.x>1.3,
   'support palm must be forward of firing grip '+ref.id);
  const highFrame=sampleLabPistolFrame('high-ready',2);
  const pitched=secondaryUpperBodyTargets({
   fraction:1,aim:0,moving:false,obstructed:false,
   stance:highFrame.stance,labContacts:contact,
   labPitch:highFrame.pitch
  });
  const unpitched=secondaryUpperBodyTargets({
   fraction:1,aim:0,moving:false,obstructed:false,
   stance:highFrame.stance,labContacts:contact,labPitch:0
  });
  assert.ok(pitched.support.y>unpitched.support.y+.45,
   'support palm must rotate with the angled pistol '+ref.id);
  assert.ok(both.support.x>16,ref.id);
  assert.ok(Number.isFinite(contact.slideOffset.x),ref.id);
  assert.ok(contact.slideOffset.y>2.6,ref.id);
 }
 // No explicit Lab stance = gameplay targets are absolutely unchanged.
 assert.deepEqual(secondaryUpperBodyTargets({
  fraction:1,aim:0,moving:false,obstructed:false
 }).firing,{x:8.2,y:-3,z:3.3});
 assert.deepEqual(secondaryUpperBodyTargets({
  fraction:1,aim:1,moving:false,obstructed:false
 }).firing,{x:13.4,y:-.25,z:2});
});
test('close retention keeps both arms on their own side, no torso penetration',()=>{
 const fire=LAB_CLOSE_RETENTION.firing;
 const support=LAB_CLOSE_RETENTION.support;
 const point=(x)=>new THREE.Vector3(x.x,x.y,x.z);
 const actual=secondaryUpperBodyTargets({
  fraction:1,aim:0,moving:false,obstructed:false,stance:'retention',
  labContacts:labPistolContacts('glock-g19-gen3')
 });
 assert.deepEqual(actual.firing,fire);
 assert.deepEqual(actual.support,support);
 assert.ok(fire.x<9&&fire.x>7,'pistol must be close, but outside the right ribs');
 assert.ok(support.x>6.7,'support palm clears front of chest/vest');
 assert.ok(support.x<fire.x,'offhand stays slightly rearward of pistol');
 assert.ok(fire.z>5.5&&support.z< -5.5,'hands never cross centerline');
 assert.ok(fire.y<0&&support.y>0,'pistol low, free palm guards left pectoral');
 assert.ok(!intersectsTorso(point(actual.firing)));
 assert.ok(!intersectsTorso(point(actual.support)));

 for(const [side,start,end,pole] of [
  ['support',ANATOMY.shoulderLeft,support,LAB_CLOSE_RETENTION.supportElbowPole],
  ['firing',ANATOMY.shoulderRight,fire,LAB_CLOSE_RETENTION.firingElbowPole]
 ]){
  const limb=solveTwoBone(point(start),point(end),10,10,point(pole),ARM_LIMITS);
  assert.equal(limb.reached,true,side+' wrist reachable');
  assert.ok(limb.joint.y< -4,side+' elbow drops alongside body');
  if(side==='support')
   assert.ok(limb.joint.z< -7,side+' elbow remains left of torso');
  else assert.ok(limb.joint.z>7,side+' elbow remains right of torso');
  assert.ok(!intersectsTorso(limb.joint),
   side+' elbow must not be buried in the vest');
 }
 const ready=secondaryUpperBodyTargets({
  fraction:1,aim:.12,moving:false,obstructed:false,
  stance:'ready'
 });
 assert.ok(ready.firing.x-fire.x>2,'pistol remains retracted versus ready');
});
test('Lab-only extra fingers have been deleted, not merely hidden',()=>{
 const lab=source('src/breach-operator-lab.ts');
 const visual=source('src/breach-operator-upper-body-output.ts');
 assert.equal(existsSync(new URL('../src/operator-lab-pistol-hand-visual.ts',
  import.meta.url)),false);
 assert.doesNotMatch(lab,/presentLabPistolHandShapes/);
 assert.doesNotMatch(visual,/BoxGeometry|operator-lab-trigger-index/);
 assert.ok(lab.includes('poseSidearmExtraDigits'));
});
test('Only empty reloads rack the rear slide, after magazine seating',()=>{
 const empty=track=>[.7,1.4,1.95,2.13,2.25,2.5]
  .map(t=>({time:t,frame:sampleLabPistolFrame(track,t)}));
 for(const name of ['reload-emergency','pistol-reload-emergency']){
  const samples=empty(name);
  assert.equal(samples[0].frame.slideRack,null);
  assert.equal(samples[1].frame.slideRack,null);
  const grasp=samples[2].frame.slideRack;
  const pull=samples[3].frame.slideRack;
  assert.ok(grasp?.weight>.5,'support hand must reach rear slide');
  assert.ok(pull?.pull>.5,'support hand must actually pull the slide');
  assert.equal(samples.at(-1).frame.slideRack,null);
 }
 for(const name of ['reload','reload-retention','pistol-reload',
   'pistol-reload-retention','pistol-reload-interrupt'])
  for(const t of [0,.4,1,1.5,2,2.5])
   assert.equal(sampleLabPistolFrame(name,t).slideRack,null,name);
 const contact=labPistolContacts('glock-g19-gen3');
 const frame=sampleLabPistolFrame('pistol-reload-emergency',2.13);
 const held=secondaryUpperBodyTargets({
  fraction:1,aim:0,moving:false,obstructed:false,
  stance:'ready',labContacts:contact,
  reloadProgress:frame.reload.progress,labSlideRack:frame.slideRack
 });
 const plain=secondaryUpperBodyTargets({
  fraction:1,aim:0,moving:false,obstructed:false,
  stance:'ready',labContacts:contact
 });
 assert.ok(held.support.y>plain.support.y+2,
  'overhand must visibly climb from support grip to rear slide');
 assert.ok(held.support.x<plain.support.x+3);
});
test('Lab uses the live operator rig and preserves the unissued-only M9 boundary',()=>{
 const lab=source('src/breach-operator-lab.ts');
 const html=source('operator-lab.html');
 const visual=source('src/operator-lab-beretta-preview.ts');
 const contract=source('src/breach-operator-animation-contract.ts');
 const rig=source('src/breach-operator-animation-controller.ts');
 for(const token of ['POSE_SIDEARM_GROUPS','poseSidearm(poseWeaponPreset)',
  'sampleLabPistolFrame(track,clock)','initialSecondaryEquipment(',
  'secondarySwitch:pistolFrame','secondaryReload:pistolReload',
  'presentLabBerettaPreview(rig,','poseSidearmArtOnly('])
  assert.ok(lab.includes(token),token);
 for(const token of ['id="poseWeapon"','id="poseAnimation"',
  'id="poseSidearmHint"','id="poseFrameNext"'])
  assert.ok(html.includes(token),token);
 assert.match(visual,/buildM9Appearance\(id\)/);
 assert.match(visual,/m9ArtSockets\(id\)\.holsterPivot/);
 assert.match(visual,/clearLabBerettaPreview/);
 assert.match(contract,/labPistolStance\?/);
 assert.match(rig,/presentSecondaryDraw\(r\.hip/);
 assert.doesNotMatch(visual,/setEquipmentChoice|requestSecondarySwitch|advanceTimedSecondaryReload/);
 assert.ok(contract.includes('labPistolScale?:number'));
 assert.ok(lab.includes('labPistolScale:sidearm?LAB_PISTOL_PREVIEW_SCALE'));
 assert.ok(lab.includes('PISTOL PREVIEW'));
 assert.ok(source('src/secondary-holster-visual.ts').includes('labScale?:number'));
 assert.ok(lab.includes('labPistolContacts(sidearm)'));
 assert.ok(!lab.includes('presentLabPistolHandShapes(rig,'));
 assert.ok(lab.includes('poseSidearmSupportAhead'));
 assert.ok(source('src/breach-operator-upper-body-output.ts')
  .includes('orientLabPistolHand('));
 assert.ok(!existsSync(new URL('../src/operator-lab-pistol-hand-visual.ts',
  import.meta.url)));
 assert.ok(lab.includes('labPistolSlideRack:pistolFrame?.slideRack'));
 assert.ok(contract.includes('labPistolContacts?:LabPistolContacts'));
 assert.ok(contract.includes('labPistolSlideRack?:'));
 assert.ok(source('src/secondary-holster-visual.ts')
  .includes('labPrimaryFromPivot?:Anchor3'));
});
