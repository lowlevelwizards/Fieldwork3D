import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBallisticPosition,assessRoomBallisticCover,roomThreatPoints}
 from '../src/worldgen/room-cover-audit.ts';

const room={id:'office',kind:'room',purpose:'office',x:0,y:0,w:160,h:160};
const door={id:'D',a:{x:0,y:60},b:{x:0,y:100}};
const base={rooms:[room],walls:[],doors:[door],openings:[],cover:[]};

test('R7A: genuine room openings, not fictitious exterior points',()=>{
 assert.equal(roomThreatPoints(base,room).length,1);
 assert.equal(roomThreatPoints({...base,doors:[]},room).length,0);
});
test('R7A: real height intersection distinguishes standing and crouched cover',()=>{
 const desk={x:118,y:80,w:16,h:45,low:false};
 const p={x:137,y:80};
 const noCover=assessBallisticPosition(base,room,p);
 const protectedAtDesk=assessBallisticPosition({...base,cover:[desk]},room,p);
 assert.equal(noCover.attackAngles,1);
 assert.equal(noCover.crouchedBlocked,0);
 assert.equal(protectedAtDesk.standingBlocked,0);
 assert.equal(protectedAtDesk.crouchedBlocked,1);
 assert.equal(protectedAtDesk.firingAngles,1);
});
test('R7A: walls are not misidentified as furniture protection',()=>{
 const wall={a:{x:70,y:0},b:{x:70,y:160}};
 const p={x:130,y:80};
 const shielded=assessBallisticPosition({...base,walls:[wall]},room,p);
 assert.equal(shielded.attackAngles,0);
 assert.equal(shielded.crouchedBlocked,0);
});
test('R7A: room survey is deterministic and never adds synthetic cover',()=>{
 const desk={x:101,y:78,w:22,h:44,low:false};
 const before=assessRoomBallisticCover(base,room);
 const after=assessRoomBallisticCover({...base,cover:[desk]},room);
 assert.deepEqual(after,assessRoomBallisticCover({...base,cover:[desk]},room));
 assert.ok(after.protectedCrouched>=before.protectedCrouched);
 assert.deepEqual(base.cover,[]);
});
