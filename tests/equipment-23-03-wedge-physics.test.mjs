import test from 'node:test';import assert from 'node:assert/strict';
import {initDoor,advanceDoor,kickDoor,pushDoor} from '../src/breach-door.ts';
import {newSession} from '../src/breach-game.ts';
import {applyRosterIdentity,initialRoster,equipRosterGear} from '../src/breach-roster.ts';
import {snapshot} from '../src/breach-replay.ts';
const door=()=>initDoor({id:'test-wedge',a:{x:0,y:0},b:{x:0,y:35},
 open:false,openedAt:0},0);
test('23.03 wedge rejects open pressure and kicking until explicitly removed',()=>{
 const d=door();d.wedged=true;d.wedgeOwnerId='rook';
 d.open=true;advanceDoor(d,.2);
 assert.equal(d.open,false);
 assert.ok((d.openFraction??0)<.01);
 assert.equal(pushDoor(d,200),false);
 assert.equal(kickDoor(d,{x:20,y:18}).opened,false);
 d.wedged=false;
 assert.equal(d.wedged,false);
});
test('23.03 issued wedge stock begins finite and replay retains count',()=>{
 let roster=initialRoster();
 roster=equipRosterGear(roster,'rook','utility','utility-wedge');
 const s=newSession();applyRosterIdentity(s,roster);
 const a=s.operators.find(o=>o.id==='rook');
 assert.equal(a.wedgeRemaining,2);
 const f=snapshot(s);
 a.wedgeRemaining--;
 assert.equal(f.actors.find(o=>o.id==='rook').wedgeRemaining,2);
});
