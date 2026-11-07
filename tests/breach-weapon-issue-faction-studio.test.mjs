import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {REFERENCE_WEAPONS,referenceWeaponChoice} from '../src/faction-reference-weapons.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {issueWeaponPreset,resolveIssuedOrLegacy,starterWeaponPreset}
 from '../src/breach-weapon-issue.ts';
import {enemyKitForEncounter} from '../src/breach-enemy-loadouts.ts';
import {initialRoster,readRoster} from '../src/breach-roster.ts';
import {startingOperator} from '../src/campaign-state.ts';
import {initialWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {studioArmedIdleAt,STUDIO_IDLE_RELOAD_PERIOD}
 from '../src/operator-studio-armed-idle.ts';

test('issued guns reference real authored AR/AK family presets and retain simulation class',()=>{
 for(const preset of FAMILY_PRESETS){
  const issued=issueWeaponPreset(preset.id);
  assert.equal(issued.weapon,preset.weapon);
  assert.equal(issued.weaponConfiguration.build.family,preset.family);
  assert.equal(issued.weaponConfiguration.build.parts.receiver,preset.parts.receiver);
 }
});
test('all forty faction references have one explicit weapon with truthful fidelity',()=>{
 assert.equal(FACTION_REFERENCES.length,40);
 assert.equal(Object.keys(REFERENCE_WEAPONS).length,40);
 for(const r of FACTION_REFERENCES){
  const issued=referenceWeaponChoice(r.id);
  assert.ok(issued.weaponConfiguration.build,r.id);
  assert.ok(['exact','representative','proxy'].includes(issued.fidelity),r.id);
  if(issued.fidelity!=='proxy')
   assert.ok(['ar','ak','hk'].includes(issued.preset.family),r.id);
 }
 assert.equal(referenceWeaponChoice('us-army-m81-1990').preset.name,'M16A2');
 assert.equal(referenceWeaponChoice('russian-flora-2000').preset.name,'AK-74M');
 assert.equal(referenceWeaponChoice('british-mtp-2015').fidelity,'proxy');
});
test('encounter role maps to consistent visual issue and actual protection',()=>{
 const roles=['occupant','sentry','lookout','patrol','investigator','reserve','leader','target'];
 const profiles=roles.map((role,i)=>enemyKitForEncounter({role},1937,i));
 for(let i=0;i<roles.length;i++){
  const p=profiles[i];
  assert.equal(p.role,roles[i]);
  assert.ok(p.weaponConfiguration.build);
  assert.equal(p.equipment.slots.primary,'primary-'+p.weapon);
  assert.deepEqual(enemyKitForEncounter({role:roles[i]},1937,i),p);
 }
 assert.equal(profiles[0].armorIntegrity,0);
 assert.equal(profiles[6].equipment.slots.armor,'armor-carrier');
 assert.ok(profiles[6].armorIntegrity>profiles[0].armorIntegrity);
 const boosted=enemyKitForEncounter({role:'occupant',weaponProfile:'prepared'},1937,0);
 assert.equal(boosted.equipment.slots.armor,'armor-soft');
});
test('starter rosters and new campaigns always resolve to concrete weapon families',()=>{
 const roster=initialRoster();
 for(const member of roster.members){
  assert.ok(member.weaponConfiguration.build,member.id);
  assert.equal(member.weaponConfiguration.weapon,member.weapon);
  assert.equal(member.weaponConfiguration.build.parts.receiver,
   issueWeaponPreset(starterWeaponPreset(member.id)).weaponConfiguration.build.parts.receiver);
 }
 assert.deepEqual(readRoster(JSON.stringify(roster)),roster);
 for(let i=0;i<4;i++){
  const operator=startingOperator(['rook','moss','ash','vale'][i],i,48);
  assert.ok(operator.weaponConfiguration.build);
  assert.equal(operator.weapon,operator.weaponConfiguration.weapon);
 }
 const retired=initialWeaponConfiguration('smg');
 const modern=resolveIssuedOrLegacy(retired,'smg','ar-m4a1');
 assert.equal(modern.weapon,'smg');
 assert.equal(modern.build?.parts.receiver,'hk-mp5-standard');
 const saved=initialWeaponConfiguration('rifle');
 assert.ok(resolveIssuedOrLegacy(saved,'rifle','ar-m16a2').build);
});
test('Studio armed idle is stable, low ready, and reloads once per 60 seconds',()=>{
 assert.equal(STUDIO_IDLE_RELOAD_PERIOD,60);
 assert.equal(studioArmedIdleAt(10).reload,0);
 assert.equal(studioArmedIdleAt(57).reload,0);
 assert.ok(studioArmedIdleAt(59).reload>0);
 assert.equal(studioArmedIdleAt(60).reload,0);
 assert.deepEqual(studioArmedIdleAt(59.2,8),studioArmedIdleAt(59.2,8));
 const html=readFileSync(new URL('../operator-studio.html',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.ok(html.includes('id="studioWeaponToggle"'));
 assert.ok(studio.includes("handlingOverride:armed?'low':undefined"));
 assert.ok(studio.includes("reference?.weapon.weaponConfiguration"));
 assert.ok(studio.includes("requestAnimationFrame(tickArmedPreview)"));
});
