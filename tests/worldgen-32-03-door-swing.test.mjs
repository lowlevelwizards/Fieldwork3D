import test from 'node:test';
import assert from 'node:assert/strict';
import {planDoorSwings} from '../src/worldgen/door-swing-planner.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';

const room=(id,purpose,x,y,w,h)=>({id,purpose,x,y,w,h,kind:'room',tone:0});
const d=(id,a,b,extra={})=>({id,a,b,open:false,openedAt:-1,kind:'hinged',...extra});
const fixture=(x,y,w,h)=>({x,y,w,h,fixture:'crate'});
const sample=(doors,rooms,cover=[],archetype='house')=>({
 archetype,doors,rooms,cover,walls:[],spawn:[],enemies:[],objective:{x:800,y:800}
});
const side=(door)=>{
 const leaf=doorLeafSegment({...door,open:true,openFraction:1});
 const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 const tip={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 return (door.b.x-door.a.x)*(tip.y-mid.y)-
  (door.b.y-door.a.y)*(tip.x-mid.x);
};
test('ordinary home entrance swings inward; public retail exit swings outward',()=>{
 const door=d('FRONT',{x:75,y:150},{x:123,y:150});
 const houseRoom=room('foyer','foyer',0,0,200,150);
 const home=planDoorSwings(sample([door],[houseRoom],[],'house'));
 assert.ok(side(home.doors[0])<0);
 const shop=planDoorSwings(sample([door],[houseRoom],[],'retail'));
 assert.ok(side(shop.doors[0])>0);
});
test('bedroom door opens away from hallway circulation',()=>{
 const door=d('D1',{x:100,y:50},{x:100,y:98});
 const bedrooms=[room('corridor','hallway',0,0,100,160),
  room('bedroom','bedroom',100,0,130,160)];
 const planned=planDoorSwings(sample([door],bedrooms));
 assert.ok(side(planned.doors[0])<0,'right side of vertical wall');
});
test('a blocked swing arc is rejected in favor of a clear side',()=>{
 const door=d('D2',{x:100,y:50},{x:100,y:98});
 const rooms=[room('corridor','hallway',0,0,100,160),
  room('bedroom','bedroom',100,0,130,160)];
 const clear=planDoorSwings(sample([door],rooms,[fixture(136,74,55,110)]));
 assert.ok(side(clear.doors[0])>0,'open into the clear corridor if room is blocked');
});
test('paired leaves swing to the same side and preserve their hinges',()=>{
 const doors=[d('LEFT',{x:0,y:150},{x:48,y:150},
 {hinge:'a',swing:-1,pairedWith:'RIGHT'}),
 d('RIGHT',{x:48,y:150},{x:96,y:150},
 {hinge:'b',swing:1,pairedWith:'LEFT'})];
 const planned=planDoorSwings(sample(doors,[room('sales','sales',-10,0,120,150)],[],'retail'));
 assert.equal(Math.sign(side(planned.doors[0])),Math.sign(side(planned.doors[1])));
 assert.equal(planned.doors[0].hinge,'a');assert.equal(planned.doors[1].hinge,'b');
});
test('sliding and shutter mechanisms keep their original physical movement',()=>{
 const doors=[d('SLIDE',{x:20,y:150},{x:68,y:150},
 {kind:'sliding',slideDirection:-1}),d('SHUTTER',{x:80,y:150},{x:176,y:150},{kind:'shutter'})];
 const after=planDoorSwings(sample(doors,[room('lobby','lobby',0,0,220,150)]));
 assert.equal(after.doors[0].swing,undefined);
 assert.equal(after.doors[0].slideDirection,-1);
 assert.equal(after.doors[1].swing,undefined);
});
test('real generated tactical maps assign deterministic hinged door choices',()=>{
 const a=generateSite(8,'small'),b=generateSite(8,'small');
 assert.deepEqual(a.doors,b.doors);
 assert.ok(a.doors.filter(x=>x.kind!=='sliding'&&x.kind!=='shutter')
  .every(x=>x.hinge==='a'||x.hinge==='b'));
});
