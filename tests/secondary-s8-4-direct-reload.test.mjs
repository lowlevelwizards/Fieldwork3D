import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,reloadNow}
 from '../src/breach-game.ts';
import {createCombatFiringPipeline}
 from '../src/breach-firing-pipeline.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {initialSecondarySwitch,requestSecondarySwitch,advanceSecondarySwitch}
 from '../src/secondary-switching.ts';

const setup=(rounds)=>{
 const s=newSession(),a=team(s)[0];
 const kit={...initialSecondaryEquipment(a.id,'glock-g26'),loadedRounds:rounds};
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 let held=requestSecondarySwitch(initialSecondarySwitch(),'secondary',kit).state;
 for(let i=0;i<60;i++)held=advanceSecondarySwitch(held,1/60,kit);
 a.secondarySwitch=held;s.phase='running';
 const counts={mag:a.magazine,res:a.reserve,serial:a.insertedMagazineId};
 const run=createCombatFiringPipeline({
  team,enemies,inSight:()=>false,isSeen:()=>false,
  liveVisibility:()=>false,unobstructed:()=>true,
  beginReload(){throw Error('hidden primary reload')},
  advanceReload(){throw Error('hidden primary reload')},
  notify(){},hear(){},battleEvent(){}
 });
 return {s,a,kit,counts,run};
};
test('S8.4: explicit running pistol reload commits once and preserves rifle inventory',()=>{
 const {s,a,kit,counts,run}=setup(3);
 const total=secondaryRoundTotal(kit),original=kit.loadedMagazineId;
 assert.equal(reloadNow(s,a.id),true);
 assert.equal(reloadNow(s,a.id),false,'one live reload at a time');
 for(let i=0;i<150&&a.secondaryReload;i++)
  run.fire(s,a,1/60);
 assert.equal(a.secondaryReload,null);
 assert.equal(a.equipment.secondary.loadedRounds,10);
 assert.ok(a.equipment.secondary.spareMagazines.some(m=>
  m.id===original&&m.rounds===3));
 assert.equal(secondaryRoundTotal(a.equipment.secondary),total);
 assert.equal(a.magazine,counts.mag);
 assert.equal(a.reserve,counts.res);
 assert.equal(a.insertedMagazineId,counts.serial);
 assert.equal(s.dropped.length,0,'retained partial magazine does not fall');
});
test('S8.4: empty drawn pistol automatically uses one issued spare and drops only empty serial',()=>{
 const {s,a,kit,counts,run}=setup(0);
 const initial=secondaryRoundTotal(kit);
 const old=kit.loadedMagazineId;
 run.fire(s,a,1/60);
 assert.equal(a.secondaryReload?.orderId,0);
 assert.equal(a.equipment.secondary.loadedRounds,0,
  'automatic reload does not teleport a new magazine at startup');
 for(let i=0;i<150&&a.secondaryReload;i++)
  run.fire(s,a,1/60);
 assert.equal(a.secondaryReload,null);
 assert.equal(a.equipment.secondary.loadedRounds,10);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),initial);
 assert.equal(s.dropped.filter(d=>d.magazineId===old).length,1);
 assert.equal(s.dropped.find(d=>d.magazineId===old)?.secondaryWeapon,'glock-g26');
 assert.equal(a.magazine,counts.mag);
 assert.equal(a.reserve,counts.res);
});
test('S8.4: no issued spare, interrupted draw and lost kit cannot trigger a ghost reload',()=>{
 const {s,a,kit,run}=setup(0);
 const prior={...kit,spareMagazines:[]};
 a.equipment={...a.equipment,secondary:prior};
 run.fire(s,a,1/60);
 assert.equal(a.secondaryReload,null);
 assert.equal(a.equipment.secondary.loadedRounds,0);
 a.equipment={...a.equipment,secondary:kit};
 a.secondarySwitch={...a.secondarySwitch,fraction:.5};
 assert.equal(reloadNow(s,a.id),false);
 assert.equal(a.secondaryReload,null);
});
