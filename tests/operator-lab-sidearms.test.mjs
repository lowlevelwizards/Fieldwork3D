import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLOCK_APPEARANCE_REFERENCES}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {M9_APPEARANCE_REFERENCES}
 from '../src/weapons/geometry/beretta-m9-silhouettes.ts';
import {POSE_SIDEARM_GROUPS,poseSidearm,poseSidearmArtOnly,
 poseWeaponType,defaultPoseWeapon,POSE_ANIMATIONS}
 from '../src/operator-lab-pose-browser.ts';
import {LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {isLabPistolTrack,sampleLabPistolFrame}
 from '../src/operator-lab-pistol-tracks.ts';

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
});
