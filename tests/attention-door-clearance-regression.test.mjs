import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interruptsWatch} from '../src/breach-plan.ts';
import {orderVisualScopes} from '../src/ui/order-visual-state.ts';
import {approachingDoorLeaf,initDoor,pushDoor,advanceDoor,PUSHED_OPEN_LIMIT}
  from '../src/breach-door.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {SQUEEZE_RADIUS,profileSamples,sweptProfileClear} from '../src/breach-navigation.ts';
import {pointToSegment} from '../src/breach-core.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');

test('LOOK/WATCH remains simple to place or cancel after a tiny finger movement',()=>{
 assert.match(main,/p.mode==='targetPreview'\|\|p.mode==='undecided'/);
 assert.match(main,/if\(looking\|\|flashMode\|\|firePlacement\|\|evacMode\)\{cancelTargeting\(\);return;/);
 assert.match(main,/AIM TOO CLOSE.*TAP FARTHER/);
 assert.doesNotMatch(main,/case 'ctxReleaseWatch'/);
});
test('WATCH is replaced by LOOK/WATCH, run and physical interactions',()=>{
 const initial={watch:false,pace:'walk',posture:'stand',fire:'engage'};
 const steps=orderVisualScopes([
  {id:1,kind:'look',p:{x:0,y:0},aimMode:'track',aimPoint:{x:50,y:0}},
  {id:2,kind:'move',p:{x:20,y:0}},
  {id:3,kind:'move',p:{x:40,y:0},paceState:'run'},
  {id:4,kind:'move',p:{x:60,y:0},paceState:'walk'},
  {id:5,kind:'look',p:{x:60,y:0},aimMode:'track',aimPoint:{x:90,y:0}},
  {id:6,kind:'door',p:{x:65,y:0}},
 ],initial);
 assert.equal(steps[0].watchBegins,true);
 assert.equal(steps[1].before.watch,true);
 assert.equal(steps[2].watchEnds,true);
 assert.equal(steps[3].before.watch,false);
 assert.equal(steps[4].watchBegins,true);
 assert.equal(steps[5].watchEnds,true);
 for(const kind of ['door','tool','interact','flash','reload','treat','evacuate'])
  assert.equal(interruptsWatch({kind},'walk'),true);
 assert.equal(interruptsWatch({kind:'move'},'walk'),false);
 assert.equal(interruptsWatch({kind:'move',paceState:'run'},'walk'),true);
 assert.match(game,/if\(interruptsWatch\(n,a.pace\)\)a.aimInstruction=null/);
});
test('body contact pulls already-open door toward wall instead of nudging a tiny amount',()=>{
 const d=initDoor({id:'CONTACT',a:{x:300,y:230},b:{x:352,y:230},
   open:true,openedAt:0,hinge:'a',swing:-1},0);
 d.openFraction=.78;
 const leaf=doorLeafSegment(d),mid={x:(leaf.a.x+leaf.b.x)/2,
   y:(leaf.a.y+leaf.b.y)/2};
 const vx=leaf.b.y-leaf.a.y,vy=-(leaf.b.x-leaf.a.x);
 const length=Math.hypot(vx,vy);
 const from={x:mid.x+vx/length*20,y:mid.y+vy/length*20};
 const next={x:mid.x+vx/length*16,y:mid.y+vy/length*16};
 assert.equal(approachingDoorLeaf(from,next,d),true);
 assert.equal(pushDoor(d,2.5),true);
 assert.equal(d.pushTarget,PUSHED_OPEN_LIMIT);
 for(let i=0;i<120;i++)advanceDoor(d,1/60);
 assert.ok(d.openFraction>1.04);
 assert.equal(approachingDoorLeaf(from,next,{...d,heldBy:'rook'}),false);
});
test('squeeze remains a three-point body, can retreat from an already-touching leaf',()=>{
 assert.ok(SQUEEZE_RADIUS>=4.5&&SQUEEZE_RADIUS<5.4);
 const samples=profileSamples({x:210,y:210},0,'squeeze');
 assert.equal(samples.length,3);
 assert.ok(samples.every(s=>s.radius===SQUEEZE_RADIUS));
 const d=initDoor({id:'LEAF',a:{x:180,y:210},b:{x:230,y:210},
   open:false,openedAt:0,hinge:'a',swing:-1},0);
 const from={x:205,y:213},to={x:205,y:230};
 assert.ok(pointToSegment(from,doorLeafSegment(d))<SQUEEZE_RADIUS+1);
 assert.equal(sweptProfileClear(from,to,[d],-Math.PI/2,'squeeze'),true);
 assert.equal(sweptProfileClear(to,from,[d],-Math.PI/2,'squeeze'),false);
});
