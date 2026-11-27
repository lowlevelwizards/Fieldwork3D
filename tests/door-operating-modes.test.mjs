import test from 'node:test';
import assert from 'node:assert/strict';
import {operatingLeaves,advanceAutomaticDoors,automaticAssemblyAvailable,manualAssemblyBlocked,automaticDoorPowered} from '../src/breach-door-operating-modes.ts';
import {styleArchitecturalDoors} from '../src/worldgen/door-families.ts';
const pair=(mode,kind='sliding')=>[
 {id:'FRONT',a:{x:0,y:0},b:{x:48,y:0},hinge:'a',pairedWith:'FRONT-R',kind,operatingMode:mode,open:false,openedAt:-1},
 {id:'FRONT-R',a:{x:48,y:0},b:{x:96,y:0},hinge:'b',pairedWith:'FRONT',kind,operatingMode:mode,open:false,openedAt:-1}
];
test('manual paired leaves are independent by default; explicit linkage is reciprocal',()=>{
 for(const mode of [undefined,'independent','coupled','automatic']){
   const doors=pair(mode);assert.equal(operatingLeaves(doors,doors[0]).length,
      mode==='coupled'||mode==='automatic'?2:1);
 }
 const doors=pair('coupled');doors[1].locked=true;
 assert.equal(manualAssemblyBlocked(operatingLeaves(doors,doors[0]),{x:20,y:20}),true);
});
test('automatic doors open as an assembly, remain open while occupied and close after delay',()=>{
 const doors=pair('automatic');
 advanceAutomaticDoors(doors,[{x:80,y:25}],1,true);
 assert.ok(doors.every(d=>d.open));
 advanceAutomaticDoors(doors,[{x:12,y:-5}],3,true);
 advanceAutomaticDoors(doors,[],4,true);
 assert.ok(doors.every(d=>d.open));
 advanceAutomaticDoors(doors,[],5,true);
 assert.ok(doors.every(d=>!d.open));
 advanceAutomaticDoors(doors,[{x:25,y:15}],5.1,true);
 assert.ok(doors.every(d=>d.open));
});
test('automatic control respects power, locks and damage',()=>{
 const doors=pair('automatic');
 assert.equal(automaticDoorPowered({sitePower:{circuits:{'mains:0':false}}}),false);
 advanceAutomaticDoors(doors,[{x:30,y:20}],1,false);
 assert.ok(doors.every(d=>!d.open));
 for(const key of ['locked','jammed','wedged','latchBroken']){
   doors[1][key]=true;
   assert.equal(automaticAssemblyAvailable(doors),false);
   advanceAutomaticDoors(doors,[{x:30,y:20}],2,true);
   assert.ok(doors.every(d=>!d.open));delete doors[1][key];
 }
});
test('public automatic generation uses the same mode for both leaves; residences are manual',()=>{
 const doors=pair(undefined,'hinged');
 const walls=[{a:{x:-60,y:0},b:{x:0,y:0}},{a:{x:96,y:0},b:{x:156,y:0}}];
 const site={archetype:'retail',expandedDoorFamilies:true,rooms:[],doors,walls};
 for(const seed of [0,2,4]){
   const generated=styleArchitecturalDoors(site,seed).doors;
   assert.equal(generated[0].operatingMode,generated[1].operatingMode);
   assert.equal(generated[0].operatingMode,seed===2?'independent':'automatic');
 }
 assert.ok(styleArchitecturalDoors({...site,archetype:'house'},0).doors.every(d=>d.operatingMode==='independent'));
});
