import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {newSession,team,planMove,planWaitAt,plannedControl,
  setNodeControl,setStartPace,planDoorFlash,planReloadAt,
  toggling,stepSession,planAim} from '../src/breach-game.ts';
test('137.1: selected route node authors persistent state; HERE remains independent',()=>{
 const s=newSession(0),a=team(s)[0],p={x:a.p.x+18,y:a.p.y};
 assert.ok(planMove(s,a.id,p));
 const id=a.plan.at(-1).id;
 assert.ok(setNodeControl(s,a.id,id,'postureState','crouch'));
 assert.ok(setNodeControl(s,a.id,id,'paceState','run'));
 assert.deepEqual(plannedControl(s,a.id,id),{posture:'crouch',pace:'run'});
 assert.deepEqual(plannedControl(s,a.id),{posture:'stand',pace:'walk'});
 assert.ok(setStartPace(s,a.id,'run'));
 assert.equal(plannedControl(s,a.id).pace,'run');
 assert.ok(planAim(s,a.id,'track',{x:p.x+22,y:p.y+25},id,'pie'));
 assert.equal(a.plan.find(n=>n.id===id).aimMode,'track');
 assert.ok(planAim(s,a.id,'fixed',{x:a.p.x+3,y:a.p.y+30},
   undefined,'look','here'));
 assert.equal(a.plan[0].kind,'look');
 assert.equal(a.plan.find(n=>n.id===id).postureState,'crouch');
});
test('137.1: WAIT uses a single clear-of-contact timer, no separate control',()=>{
 const s=newSession(0),a=team(s)[0];
 assert.ok(planWaitAt(s,a.id,.5,'here'));
 toggling(s);
 for(let i=0;i<34;i++)stepSession(s,1/60);
 assert.equal(a.plan.some(n=>n.kind==='wait'),false);
});
test('137.1: door FLASH failure is atomic; no stray opening is queued',()=>{
 const s=newSession(0),a=team(s)[0],door=s.doors[0];
 const before=a.plan.map(n=>n.id);
 assert.equal(planDoorFlash(s,a.id,door.id,{x:-1000,y:-1000}),false);
 assert.deepEqual(a.plan.map(n=>n.id),before);
});
test('137.1: selected HERE/waypoint can insert a reload',()=>{
 const s=newSession(0),a=team(s)[0];
 assert.ok(planMove(s,a.id,{x:a.p.x+18,y:a.p.y}));
 const id=a.plan.at(-1).id;
 assert.ok(planReloadAt(s,a.id,id));
 assert.equal(a.plan.at(-1).kind,'reload');
 assert.ok(planReloadAt(s,a.id));
 assert.equal(a.plan[0].kind,'reload');
});
test('137.1: floating controls are scoped to selection, no horizontal tray',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
 assert.ok(main.includes("door?doorCenter(door):node?.p??a.p"));
 const doorActions=contextActionChoices({
   door:true,node:false,flashRemaining:2,posture:'stand',pace:'walk',
   firePolicy:'engage',reserve:24,magazine:12
 });
 assert.ok(doorActions.some(action=>action.id==='ctxDoorFlash' && !action.disabled));
 assert.ok(!main.includes("id:'ctxHere'"));
 assert.ok(!main.includes("id:'ctxEnd'"));
 assert.ok(!main.includes("id:'ctxHoldClear'"));
 assert.ok(css.includes('.context-primary'));
 assert.ok(css.includes('overflow:visible'));
});
