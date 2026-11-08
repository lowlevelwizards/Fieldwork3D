import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart} from '../src/equipment-weapon-assemblies.ts';
import {ARSENAL_MAGAZINE_CAPACITIES}
 from '../src/arsenal/magazine-identities.ts';
import {liveMagazineCapacity,standardReserveRounds,freshMagazineIssue,
 fitMagazineInventory,magazineAlert}
 from '../src/arsenal/live-magazine-capacity.ts';
import {newSession,team,beginReload,advanceReload}
 from '../src/breach-game.ts';
import {initialRoster,configureRosterWeaponBodyPart}
 from '../src/breach-roster.ts';

const all=Object.entries(ARSENAL_MAGAZINE_CAPACITIES);
test('all sixteen authored magazine variants are simulation capacities',()=>{
 assert.equal(all.length,16);
 for(const preset of FAMILY_PRESETS){
  const config=selectWeaponFamilyPreset(
   initialWeaponConfiguration(preset.weapon),preset.id);
  const id=config.build?.parts.magazine;
  assert.ok(id,preset.id);
  const capacity=ARSENAL_MAGAZINE_CAPACITIES[id];
  assert.equal(liveMagazineCapacity(preset.weapon,config),capacity,preset.id);
  const issue=freshMagazineIssue('test',preset.weapon,config);
  assert.equal(issue.magazine,capacity);
  assert.equal(issue.reserve,capacity*3);
  assert.deepEqual(issue.magazines.map(m=>m.rounds),
   [capacity,capacity,capacity]);
 }
 assert.equal(liveMagazineCapacity('shotgun'),6);
 assert.equal(standardReserveRounds('shotgun'),24);
});
test('switching to a smaller physical magazine conserves rounds without overfilling',()=>{
 const initial=FAMILY_PRESETS.find(p=>p.id==='ar-m4a1');
 assert.ok(initial);
 const thirty=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),initial.id);
 const twenty=setConfiguredFamilyPart(thirty,'magazine','ar-mag20');
 assert.equal(liveMagazineCapacity('carbine',twenty),20);
 const source=freshMagazineIssue('rook','carbine',thirty);
 const before=source.magazine+source.reserve;
 const fitted=fitMagazineInventory('rook','carbine',twenty,
  source.magazine,source.reserve,source.magazines);
 assert.equal(fitted.magazine,20);
 assert.equal(fitted.magazine+fitted.reserve,before);
 assert.equal(fitted.magazines.reduce((n,m)=>n+m.rounds,0),fitted.reserve);
 assert.ok(fitted.magazines.every(m=>m.rounds>0&&m.rounds<=20));
 assert.equal(new Set(fitted.magazines.map(m=>m.id)).size,
  fitted.magazines.length);
});
test('quick play change of magazine reissues only its selected physical size',()=>{
 const roster=initialRoster();
 const m=roster.members[0];
 const desired=m.weaponConfiguration.build?.parts.magazine==='ar-mag20'?
  'ar-mag30':'ar-mag20';
 const updated=configureRosterWeaponBodyPart(roster,m.id,'magazine',desired);
 const next=updated.members[0];
 assert.equal(next.magazine,liveMagazineCapacity(next.weapon,next.weaponConfiguration));
 assert.equal(next.reserve,next.magazine*3);
 assert.equal(next.magazines.length,3);
 assert.equal(next.magazines.reduce((n,v)=>n+v.rounds,0),next.reserve);
});
test('emergency reload uses a real capacity and owned reserve only',()=>{
 const s=newSession(),a=team(s)[0];
 const cap=liveMagazineCapacity(a.weapon,a.weaponConfiguration);
 const starting=a.reserve;
 a.magazine=0;
 assert.ok(beginReload(s,a));
 assert.equal(a.reloadMode,'emergency');
 for(let i=0;i<360&&a.reload>0;i++)advanceReload(s,a,1/60);
 assert.equal(a.magazine,cap);
 assert.equal(a.reserve,starting-cap);
 assert.equal(a.spareMagazines.reduce((n,m)=>n+m.rounds,0),a.reserve);
 a.magazine=0;a.reserve=0;a.spareMagazines=[];
 assert.equal(beginReload(s,a),false);
});
test('HUD shows steady red at zero, animated orange at <=25%, normal above',()=>{
 assert.equal(magazineAlert(0,30),'empty');
 assert.equal(magazineAlert(1,30),'low');
 assert.equal(magazineAlert(8,30),'normal');
 assert.equal(magazineAlert(5,20),'low');
 assert.equal(magazineAlert(6,20),'normal');
 assert.equal(magazineAlert(1,6),'low');
});
