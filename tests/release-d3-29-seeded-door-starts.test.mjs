import test from 'node:test';
import assert from 'node:assert/strict';
import {seededInitialDoorPose,applySeededDoorStarts}
 from '../src/worldgen/door-initial-states.ts';
import {initDoor,advanceDoor} from '../src/breach-door.ts';
import {newSession} from '../src/breach-game.ts';

const base=(id)=>({id,a:{x:100,y:100},b:{x:144,y:100},
 open:false,openedAt:-1,kind:'hinged',hinge:'a',swing:1});
const site=(seed)=>({seed,archetype:'house',condition:'occupied',
 rooms:[{id:'a',kind:'room',purpose:'living',x:70,y:55,w:120,h:43},
        {id:'b',kind:'room',purpose:'hallway',x:70,y:102,w:120,h:140}],
 doors:[]});
test('D3.29H: per-door open pose is seeded and independent of list order',()=>{
 const s=site(99934),doors=Array.from({length:80},(_,i)=>base('D'+i));
 const forward=applySeededDoorStarts(s,doors);
 const reverse=applySeededDoorStarts(s,[...doors].reverse()).reverse();
 assert.deepEqual(forward,reverse);
 assert.deepEqual(forward,applySeededDoorStarts(s,doors));
 assert.ok(forward.some(x=>x.open));
 assert.ok(forward.some(x=>!x.open));
 assert.ok(forward.some(x=>x.open&&x.openFraction<1));
});
test('D3.29H: a locked door never begins ajar through random sampling',()=>{
 const s=site(1456);
 const doors=Array.from({length:60},(_,i)=>({...base('D'+i),locked:true}));
 assert.ok(applySeededDoorStarts(s,doors).every(d=>!d.open&&d.openFraction===undefined));
});
test('D3.29H: explicit authored open/partial door pose remains authoritative',()=>{
 const s=site(1000);
 const d={...base('EXPLICIT'),open:true,openFraction:.44};
 assert.deepEqual(seededInitialDoorPose(s,d),d);
});
test('D3.29H: hinge motor rests at seeded angle without invented opening',()=>{
 const d=initDoor({...base('MID'),open:true,openFraction:.38},0);
 assert.equal(d.openFraction,.38);
 assert.equal(d.pushTarget,.38);
 advanceDoor(d,1/60);
 assert.ok(Math.abs(d.openFraction-.38)<.001);
 assert.equal(d.open,true);
});
test('D3.29H: interacting with ajar door requests wider opening',()=>{
 const d=initDoor({...base('MID2'),open:true,openFraction:.38},0);
 d.pushTarget=1;
 advanceDoor(d,.2);
 assert.ok(d.openFraction>.38);
});
test('D3.29H: generated physical doors preserve coherent open fraction',()=>{
 const s=newSession(0,19178827,'floor-plan','small');
 for(const door of s.doors){
  assert.ok((door.openFraction??0)>=0);
  assert.ok((door.openFraction??0)<=1.55);
  if(door.locked)assert.equal(door.open,false);
 }
});
