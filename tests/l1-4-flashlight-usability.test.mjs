import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,toggleWeaponLight} from '../src/breach-game.ts';
import {initialWeaponConfiguration,setWeaponAttachment,
 weaponAttachmentAllowed} from '../src/equipment-weapon-assemblies.ts';
import {fittedWeaponLight,weaponLightEditable,weaponLightEmitting}
 from '../src/equipment-weapon-light-operations.ts';
import {lightControlState} from '../src/equipment-weapon-light-ui.ts';
import {activeWeaponLightSources} from '../src/equipment-portable-light-sources.ts';
import {actorLightingLevels} from '../src/equipment-sight-lighting.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {weaponLightEmitter} from '../src/equipment-weapon-light-beam.ts';
import {l1BaselineSite} from '../scripts/audit-l1-lighting-baseline.mjs';
import {issuePracticeFlashlightKit} from '../src/equipment-training-flashlight-kit.ts';
import {DEFAULT_TRAINING_CONFIG,normalizeTrainingConfig}
 from '../src/training/training-courses.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {trialConfig} from '../src/training/training-trials.ts';

const mounted=()=>setWeaponAttachment(initialWeaponConfiguration('carbine'),
 'light','light-compact');
test('L1.4 a compatible physically fitted light is the only light eligibility',()=>{
 const config=mounted();
 const a={health:4,weaponLightOn:true,weaponConfiguration:config};
 assert.equal(fittedWeaponLight(a),true);
 assert.equal(weaponLightEmitting(a),true);
 assert.equal(weaponLightEditable(a,'planning'),true);
 assert.equal(weaponLightEditable(a,'running'),true);
 assert.equal(weaponLightEditable(a,'won'),false);
 assert.equal(weaponLightEditable(a,'running',true),false);
 assert.equal(weaponLightEmitting({...a,health:0}),false);
 assert.equal(weaponLightEditable({...a,health:0},'planning'),false);
 assert.equal(weaponLightEmitting({...a,weaponLightOn:false}),false);
 assert.equal(fittedWeaponLight({weaponConfiguration:initialWeaponConfiguration('carbine')}),false);
 const wrong=initialWeaponConfiguration('shotgun');
 if(!weaponAttachmentAllowed(wrong,'light','light-compact')){
  const forged={...wrong,slots:{...wrong.slots,light:'light-compact'}};
  assert.equal(fittedWeaponLight({weaponConfiguration:forged}),false,
   'a stale serialized incompatible slot must not illuminate');
 }
});
test('L1.4 downed operators cannot toggle, illuminate or appear ON in UI',()=>{
 const s=newSession(),a=s.operators.find(a=>a.id==='rook');
 assert.ok(a);
 a.weaponConfiguration=mounted();a.weaponLightOn=false;
 const previous=s.illuminationRevision;
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.equal(s.illuminationRevision,previous+1);
 assert.equal(lightControlState(a,'running').pressed,true);
 a.health=0;
 assert.equal(toggleWeaponLight(s,a.id),false);
 assert.equal(s.illuminationRevision,previous+1);
 assert.equal(lightControlState(a,'running').pressed,false);
 assert.equal(lightControlState(a,'running').disabled,true);
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
});
test('L1.4 source uses physical cover/walls and same mounted emitter',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',l1BaselineSite());
 const a=s.operators.find(a=>a.id==='rook');
 a.weaponConfiguration=mounted();a.weaponLightOn=true;
 a.p={x:210,y:300};a.heading=.2;a.weaponYaw=.41;a.aimSideOffset=2;
 const cover=s.coverState,walls=s.site.walls;
 const found=activeWeaponLightSources(s.operators,s.doors,{cover,walls});
 assert.equal(found.length,1);
 const clearance=weaponClearance({x:a.p.x,z:a.p.y,
  heading:a.heading,weaponYaw:a.weaponYaw,
  shoulderOffset:a.aimSideOffset,weapon:a.weapon,
  weaponConfiguration:a.weaponConfiguration,aim:a.aim,
  velocity:a.velocity,recoil:a.recoil,posture:a.posture
 },s.doors,cover,walls);
 assert.deepEqual(found[0].p,
  weaponLightEmitter(clearance.muzzle,a.weaponConfiguration));
 assert.equal(found[0].heading,clearance.muzzle.yaw);
});
test('L1.4 light toggle invalidates optical levels within identical step',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',l1BaselineSite());
 const a=s.operators.find(a=>a.id==='rook');
 a.weaponConfiguration=mounted();a.weaponLightOn=false;
 const before=actorLightingLevels(s);
 const t=s.seconds;
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.equal(s.seconds,t);
 const after=actorLightingLevels(s);
 assert.notEqual(after,before);
 assert.equal(actorLightingLevels(s),after);
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.notEqual(actorLightingLevels(s),after);
});
test('L1.4 unscored practice issues only compatible lights, starts OFF',()=>{
 const cfg=normalizeTrainingConfig({...DEFAULT_TRAINING_CONFIG,
  lighting:'blackout',lightKit:'flashlight'});
 const s=newSession(0,undefined,'full-view','small','hold',buildTrainingSite(cfg));
 const blue=s.operators.filter(a=>a.side==='blue');
 for(const a of blue)a.weaponConfiguration=initialWeaponConfiguration('carbine');
 const count=issuePracticeFlashlightKit(s);
 assert.equal(count,blue.length);
 assert.ok(blue.every(a=>fittedWeaponLight(a)&&!a.weaponLightOn));
 assert.equal(issuePracticeFlashlightKit(s),count);
 assert.equal(cfg.lightKit,'flashlight');
 assert.deepEqual(normalizeTrainingConfig({}),DEFAULT_TRAINING_CONFIG,
  'legacy training configuration must not change');
});
test('L1.4 historical scored blackout trial remains untouched by training kit',()=>{
 const cfg={...trialConfig('blackout'),activity:'trial',trial:'blackout'};
 const s=newSession(0,undefined,'full-view','small','hold',buildTrainingSite(cfg));
 const a=s.operators.find(a=>a.id==='rook');
 a.weaponConfiguration=initialWeaponConfiguration('carbine');
 const before=a.weaponConfiguration;
 assert.equal(issuePracticeFlashlightKit(s),0);
 assert.equal(a.weaponConfiguration,before);
 assert.equal(s.site.trainingTrial.id,'blackout');
 assert.equal(s.site.trainingTrial.version,1);
});
test('L1.4 keyboard/touch command shares the guarded, visible toolbar switch',()=>{
 const code=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const hud=code('ui/tactical-hud-controller.ts');
 assert.match(hud,/tacticalBar\?\.querySelector\('\.actions'\)/);
 assert.match(hud,/if\(toggleWeaponLight\(port.state,port.selected\)\)/);
 assert.match(hud,/e\.code==='KeyF'/);
 assert.match(hud,/light\.click\(\)/);
 assert.match(hud,/fieldLightButton\.hidden=!light\.fitted/);
 assert.match(code('equipment-training-flashlight-kit.ts'),/session\.site\.trainingTrial/);
 assert.match(code('breach-mission-controller.ts'),/request\.trainingLightKit==='flashlight'/);
});
test('L1.4 both renderers honor fitted light and invalidation/physical blockers',()=>{
 const code=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const flat=code('breach-2d-world-renderer.ts'),iso=code('breach-3d.ts');
 assert.match(flat,/state\.operators\.filter\(a=>weaponLightEmitting\(a\)\)/);
 assert.match(iso,/const lightOn=weaponLightEmitting\(actor\)/);
 assert.match(flat,/previous\.shoulderOffset/);
 assert.match(iso,/this\.beamBlockerSignature!==signature/);
 assert.match(iso,/for\(const visible of this\.actors\.values\(\)\)visible\.beamLast=null/);
 assert.match(code('equipment-sight-lighting.ts'),/cover:session\.coverState,walls:site\.walls/);
});
