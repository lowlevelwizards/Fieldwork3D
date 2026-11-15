import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionDoorPressurePolicy,doorClosingContested} from '../src/breach-door-pressure-frame.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
const door={id:'D6',a:{x:394,y:354},b:{x:394,y:318},
 open:true,openFraction:.372,kind:'hinged',hinge:'a',swing:-1,
 angularVelocity:0,openedAt:0};
const leaf=doorLeafSegment(door);
const midpoint={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
test('R2.3: physically near active MOVE protects partial leaf without episode',()=>{
 const mover={id:'vale',side:'blue',health:4,p:midpoint,
  nav:[{x:304,y:336}],doorTraversal:null,
  plan:[{id:2,kind:'move',p:{x:442.14,y:462}}]};
 const session={seconds:10,operators:[mover],doors:[door]};
 assert.equal(sessionDoorPressurePolicy(session,mover).deferClosing(door),true);
 assert.equal(doorClosingContested(session,door),true);
});
test('R2.3: distant and authored WAIT do not protect incidental contact',()=>{
 const mover={id:'vale',side:'blue',health:4,p:{x:660,y:660},
  nav:[],doorTraversal:null,
  plan:[{id:2,kind:'move',p:{x:442.14,y:462}}]};
 const session={seconds:12,operators:[mover],doors:[door]};
 assert.equal(sessionDoorPressurePolicy(session,mover).deferClosing(door),false);
 const waiter={...mover,p:midpoint,plan:[{id:2,kind:'wait',p:midpoint}]};
 const other={seconds:13,operators:[waiter],doors:[door]};
 assert.equal(sessionDoorPressurePolicy(other,waiter).deferClosing(door),false);
});
