import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {l1BaselineSite} from '../scripts/audit-l1-lighting-baseline.mjs';
import {newSession,planSitePowerControl,team,step,undoPlan,redoPlan}
 from '../src/breach-game.ts';
import {sitePowerControls,powerControlAt,POWER_CONTROL_REACH}
 from '../src/equipment-site-power-controls.ts';
import {planSiteLighting} from '../src/equipment-site-lighting.ts';
import {actorLightingLevels} from '../src/equipment-sight-lighting.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';

const make=()=>newSession(0,undefined,'full-view','small','hold',l1BaselineSite());
const near=(s,control)=>{const a=team(s)[0];a.p={x:control.p.x+8,y:control.p.y};
 a.priorP={...a.p};a.heading=0;a.weaponYaw=0;return a;};
const run=(s,count=100)=>{
 s.phase='running';
 for(let i=0;i<count;i++)step(s,1/60);
};
test('L1.2 real wall hardware owns circuit and local switch identities',()=>{
 const s=make(),topology=sitePowerControls(s.site);
 assert.ok(topology.some(c=>c.kind==='breaker'));
 assert.ok(topology.some(c=>c.kind==='switch'));
 assert.ok(topology.every(c=>powerControlAt(s.site,c.id)===c));
 assert.equal(new Set(topology.map(c=>c.id)).size,topology.length);
 const first=topology[0];
 assert.ok(first.p.x>0&&first.p.y>0);
 assert.deepEqual(sitePowerControls(s.site),topology);
 const decorated={...s.site,wallDetails:[
  {id:'actual-panel',roomId:s.site.rooms[0].id,kind:'breaker-panel',
   x:300,y:190,height:22,angle:0,width:14,depth:18},
  {id:'actual-switch',roomId:s.site.rooms[1].id,kind:'light-switch',
   x:200,y:160,height:19,angle:0,width:5,depth:3}
 ]};
 const actual=sitePowerControls(decorated);
 assert.ok(actual.some(c=>c.sourceDetailId==='actual-panel'&&c.p.x===300));
 assert.ok(actual.some(c=>c.sourceDetailId==='actual-switch'&&c.p.x===200));
 assert.ok(!actual.some(c=>c.kind==='switch'&&!c.sourceDetailId));
 const blank={...s.site,rooms:[],wallDetails:[]};
 assert.deepEqual(sitePowerControls(blank),[]);
});
test('L1.2 palettes include electrical actions only when supplied with known nearby hardware',()=>{
 const base={door:false,node:false,flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:20};
 assert.ok(!contextActionChoices(base).some(x=>x.id.startsWith('ctxPower:')));
 const action={id:'ctxPower:off:breaker:mains:0',
  label:'CUT MAINS A',group:'primary'};
 assert.deepEqual(contextActionChoices({...base,powerActions:[action]})
  .filter(x=>x.id.startsWith('ctxPower:')),[action]);
 assert.equal(contextActionChoices({...base,door:true,powerActions:[action]})
  .some(x=>x.id.startsWith('ctxPower:')),false);
 const source=readFileSync(new URL('../src/ui/tactical-palette-controller.ts',
  import.meta.url),'utf8');
 assert.match(source,/liveVisibility\(state,control\.p\)/);
 assert.match(source,/POWER_CONTROL_REACH/);
});
test('L1.2 planning is an ordinary undoable order and does not flip power remotely',()=>{
 const s=make();
 const control=sitePowerControls(s.site).find(c=>c.kind==='breaker'&&
  c.circuit==='mains:0');
 assert.ok(control);
 const a=near(s,control);
 const power=s.sitePower.circuits['mains:0'];
 const rev=s.sitePower.revision;
 assert.equal(planSitePowerControl(s,a.id,control.id,!power),true);
 assert.equal(s.sitePower.revision,rev);
 assert.equal(s.sitePower.circuits['mains:0'],power);
 assert.equal(a.plan.length,1);
 assert.equal(a.plan[0].kind,'interact');
 assert.equal(a.plan[0].objectId,control.id);
 assert.equal(a.plan[0].interaction,'power-off');
 assert.equal(undoPlan(s,a.id),true);
 assert.equal(a.plan.length,0);
 assert.equal(redoPlan(s,a.id),true);
 assert.equal(a.plan.length,1);
 assert.equal(planSitePowerControl(s,a.id,'breaker:missing',true),false);
 assert.equal(planSitePowerControl(s,a.id,control.id,power),false);
});
test('L1.2 selection inserts at selected waypoint rather than unrelated end',()=>{
 const s=make(),control=sitePowerControls(s.site).find(c=>c.kind==='breaker');
 const a=near(s,control);
 const before={id:s.nextId++,kind:'wait',p:{...a.p},duration:.5};
 const later={id:s.nextId++,kind:'wait',p:{x:a.p.x+90,y:a.p.y},duration:.5};
 a.plan=[before,later];
 const next=!s.sitePower.circuits[control.circuit];
 assert.equal(planSitePowerControl(s,a.id,control.id,next,before.id),true);
 assert.equal(a.plan[1].objectId,control.id);
 assert.equal(a.plan[1].p.x,before.p.x);
 assert.equal(a.plan[2].id,later.id);
 assert.equal(planSitePowerControl(s,a.id,control.id,next,99999),false);
});
test('L1.2 fixed-tick physical hold executes once and invalidates field',()=>{
 const s=make(),control=sitePowerControls(s.site).find(c=>c.kind==='breaker'&&
   c.circuit==='mains:0');
 const a=near(s,control);const before=actorLightingLevels(s);
 assert.equal(planSitePowerControl(s,a.id,control.id,false),true);
 run(s,9);
 assert.equal(s.sitePower.circuits['mains:0'],true,
  'planning may not apply a power effect before timed contact');
 run(s,75);
 assert.equal(s.sitePower.circuits['mains:0'],false);
 assert.equal(s.sitePower.revision,1);
 assert.equal(a.plan.length,0);
 assert.notEqual(actorLightingLevels(s),before);
});
test('L1.2 no ghost toggles: blocked or out-of-reach controls cancel',()=>{
 const s=make(),control=sitePowerControls(s.site).find(c=>c.kind==='breaker');
 const a=near(s,control);
 assert.equal(planSitePowerControl(s,a.id,control.id,false),true);
 a.p={x:control.p.x+POWER_CONTROL_REACH+10,y:control.p.y};
 run(s,5);
 assert.equal(s.sitePower.circuits[control.circuit],true);
 assert.equal(a.plan.length,0);
 assert.ok((a.failedOrders??0)>=1);
});
test('L1.2 context actions author the same physical order, not immediate mutation',()=>{
 const s=make(),control=sitePowerControls(s.site).find(c=>c.kind==='breaker');
 const a=near(s,control),before=s.sitePower.revision;
 const result=dispatchTacticalContextCommand({
  state:s,selected:a.id,actor:a,node:undefined,door:undefined,
  selectedActiveWatch:false,action:'ctxPower:off:'+control.id,
  medicalCandidate:()=>null
 });
 assert.equal(result.handled,true);
 assert.equal(s.sitePower.revision,before);
 assert.equal(a.plan[0].objectId,control.id);
});
test('L1.2 control artwork and reach checks share the same site hardware',()=>{
 const p=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',
  import.meta.url),'utf8');
 const flat=readFileSync(new URL('../src/breach-2d-world-renderer.ts',
  import.meta.url),'utf8');
 const motor=readFileSync(new URL('../src/breach-order-interactions.ts',
  import.meta.url),'utf8');
 assert.match(p,/sitePowerControls\(site\)/);
 assert.match(p,/sourceDetailId/);
 assert.match(flat,/sitePowerControls\(state\.site\)/);
 assert.match(motor,/sweptBodyClear\(a\.p,control\.p,s\.doors,1\.5,sessionWorldGeometry\(s\)\)/);
 assert.match(motor,/POWER_ACTION_SECONDS/);
});
