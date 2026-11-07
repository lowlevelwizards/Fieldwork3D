import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {POSE_ANIMATIONS,POSE_ARMOR_OPTIONS,POSE_RIG_OPTIONS,
 poseArmorEquipment,poseRigEquipment,poseWeaponType,defaultPoseWeapon,
 posePreset} from '../src/operator-lab-pose-browser.ts';
test('Every current weapon family and animation belongs to the unified Lab',()=>{
 for(const preset of FAMILY_PRESETS)
  assert.equal(posePreset(preset.id)?.weapon,preset.weapon,preset.id);
 assert.equal(poseWeaponType('hk-mp5k-pdw'),'smg');
 assert.equal(poseWeaponType('hk-g3a4'),'rifle');
 assert.equal(poseWeaponType('ak-aks74u'),'carbine');
 assert.equal(poseWeaponType('none'),'none');
 assert.equal(poseWeaponType('shotgun'),'shotgun');
 assert.equal(defaultPoseWeapon('carbine'),'ar-m4a1');
 assert.equal(defaultPoseWeapon('rifle'),'ak-akm');
 assert.deepEqual(new Set(POSE_ANIMATIONS.map(x=>x.id)),new Set(LAB_TRACKS));
 assert.equal(POSE_ANIMATIONS.length,LAB_TRACKS.length);
 for(const t of ['reload-retention','short-stock','down-slump','crouch-walk'])
  assert.ok(POSE_ANIMATIONS.some(x=>x.id===t));
});
test('Armor and rig pickers maintain actual equipment-slot compatibility',()=>{
 for(const [s] of POSE_ARMOR_OPTIONS)
  assert.match(poseArmorEquipment(s),/^armor-(none|soft|carrier)$/);
 for(const [s] of POSE_RIG_OPTIONS)
  assert.match(poseRigEquipment(s),/^rig-(none|light|full)$/);
 assert.equal(poseArmorEquipment('plate-heavy'),'armor-carrier');
 assert.equal(poseArmorEquipment('soft-flak'),'armor-soft');
 assert.equal(poseRigEquipment('full-chest'),'rig-full');
 assert.equal(poseRigEquipment('chicom-rig'),'rig-light');
});
test('One regular Operator Lab replaces the floating Pose Fit-only inspector',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['poseWeapon','poseArmor','poseRig','poseUniform',
   'poseAnimation','poseInspectorReport','poseStrictContact'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/data-lab-tab="poses"/);
 assert.doesNotMatch(html,/body\.pose-fit-mode main|id="poseFitPanel"/);
 assert.doesNotMatch(lab,/document\.body\.classList\.add\('pose-fit-mode'\)/);
 assert.match(lab,/const poseWeaponConfig=selectedPosePreset/);
 assert.match(lab,/poseAnimationSelect\.addEventListener\('change'/);
 assert.match(html,/requested\.get\('poseFit'\)==='1'\?'poses'/);
});
