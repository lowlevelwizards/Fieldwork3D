/** A2.4 reproducible weapon carry silhouette and clearance matrix.
 * Node shape checks and shot-time geometry, NOT visual signoff or GPU FPS.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {chooseCarry} from '../src/breach-carry-policy.ts';
const poses=['low','high','ready','point','ads','short'];
const scenarios=[
 {name:'patrol',intent:'move',moving:.6,aim:0,friendlyNear:false},
 {name:'watch',intent:'look',moving:0,aim:0,friendlyNear:false},
 {name:'stack',intent:'stack',moving:.1,aim:0,friendlyNear:true},
 {name:'buddy-ahead',intent:'entry',moving:.25,aim:0,
  friendlyNear:true,friendlyAhead:true},
 {name:'close-contact',intent:'engage',moving:0,
  aim:.6,friendlyNear:false,threatRange:20},
 {name:'ads',intent:'engage',moving:0,aim:.95,
  friendlyNear:false,threatRange:200},
 {name:'wall',intent:'move',moving:.3,aim:0,obstruction:true,
  friendlyNear:false},
 {name:'run',intent:'run',moving:1,aim:.5,friendlyNear:false},
 {name:'squeeze',intent:'squeeze',moving:.2,
  aim:0,friendlyNear:false}
];
const catalog=[...FAMILY_PRESETS.map(p=>({
 id:p.id,weapon:p.weapon,
 config:selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id)
})),...['carbine','rifle','smg','shotgun'].map(weapon=>({
 id:'classic-'+weapon,weapon,config:undefined
}))];
const report={schema:1,stage:'A2.4',families:catalog.length,
 poses:poses.length,triggers:scenarios.map(s=>({
 name:s.name,...chooseCarry({...s,obstruction:!!s.obstruction,
 weapon:'carbine'})
 })),samples:[],failures:[],note:'Observable geometry only'};
for(const item of catalog){
 const record={id:item.id,poses:[],clearance:[]};
 for(const pose of poses){
  const fit=fitWeaponPose({weapon:item.weapon,
   configuration:item.config,handling:pose,shortCompression:pose==='short'?1:undefined,
   recoil:0,yaw:0});
  const data={pose,rotation:fit.rotation.toArray().slice(0,3),
   butt:fit.stock.toArray(),grip:fit.primary.toArray(),
   support:fit.support.toArray(),stockError:fit.stockError,
   contactError:fit.contactError};
  record.poses.push(data);
  if(![...data.rotation,...data.butt,...data.grip,...data.support,
    data.stockError,data.contactError].every(Number.isFinite))
    report.failures.push(item.id+' '+pose+' non-finite');
 }
 const muzzle=muzzleAtShot({x:90,z:70,heading:0,weaponYaw:0,
  weapon:item.weapon,weaponConfiguration:item.config,aim:0,
  velocity:0,recoil:0,posture:'stand'});
 for(const delta of [24,12,7,1,-5,-16]){
  const x=muzzle.x+delta;
  const clearance=weaponClearance({
   x:90,z:70,heading:0,weaponYaw:0,weapon:item.weapon,
   weaponConfiguration:item.config,aim:0,velocity:0,
   recoil:0,posture:'stand'},[],[],[{a:{x,y:0},b:{x,y:150}}]);
  record.clearance.push({delta,compression:clearance.compression,
   carry:clearance.carryOverride,blocked:clearance.blocked,
   obstruction:clearance.obstruction});
 }
 report.samples.push(record);
}
const k=process.argv.indexOf('--out');
if(k>=0){const path=process.argv[k+1];if(!path)throw Error('--out path');
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({stage:report.stage,families:catalog.length,
 poses:poses.length,triggers:scenarios.length,
 failures:report.failures.slice(0,15)},null,2));
if(report.failures.length)process.exitCode=1;
