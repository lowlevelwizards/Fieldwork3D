/** D3.32 read-only reproducible Clinic D9 physical scene probe.
 * Separate geometry questions from route adoption. No actor is moved and
 * no authored order or shipped motor code changes occur in this witness.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,bodyClear} from '../src/breach-navigation.ts';
import {doorLeafBypass} from '../src/breach-door-leaf-bypass.ts';
import {routeWithNormalWorld} from '../src/breach-squeeze-route.ts';
const from={x:438.58021388219123,y:288.3752156662747};
const first={x:432,y:352},goal={x:512.05,y:585};
test('D3.32 Clinic D9 open leaf: distinguish first stride and candidate joins',()=>{
 const site=generateSite(14490156,'standard',undefined,
  {mission:'intel'},{archetype:'clinic'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,14490156,'full-view',
  site.scale??'standard','intel',quiet,{enableCivilians:false});
 const actualOpen=new Map([
  ['FRONT',1.55],['D3',1],['D9',1.55],['D10',1],
  ['SERVICE',1],['COURT-1',1],['COURT-2',1]
 ]);
 for(const door of session.doors){
  const fraction=actualOpen.get(door.id);
  if(fraction!==undefined)Object.assign(door,{
   open:true,openFraction:fraction,pushTarget:fraction,
   angularVelocity:0,heldBy:null
  });
 }
 const world=sessionWorldGeometry(session);
 const door=session.doors.find(d=>d.id==='D9');
 assert.ok(door,'generated site must retain same obstructing D9');
 const sweep=(a,b)=>sweptBodyClear(a,b,session.doors,
  OPERATOR_RADIUS,world);
 const stand=p=>bodyClear(p,session.doors,OPERATOR_RADIUS,world);
 const leaf=doorLeafSegment(door);
 const candidates=[];
 const direct=sweep(from,first);
 for(const radius of [2,4,8,12,16,24,32,42,56,72])
  for(let turn=0;turn<32;turn++){
   const theta=2*Math.PI*turn/32;
   const step={x:from.x+Math.cos(theta)*radius,
    y:from.y+Math.sin(theta)*radius};
   if(!sweep(from,step))continue;
   const nextClear=sweep(step,first);
   const route=radius<=32?routeWithNormalWorld(
    step,first,session.doors,world):[];
   candidates.push({r:radius,a:turn,
    p:{x:Number(step.x.toFixed(2)),y:Number(step.y.toFixed(2))},
    nextClear,routeLength:route.length,
    routeFirstClear:!!route.length&&sweep(step,route[0])});
  }
 const bypass=doorLeafBypass(from,first,door,sweep);
 console.log('D332_D9_COLD_PROBE',JSON.stringify({
  from,first,goal,door:{id:door.id,a:door.a,b:door.b,
   hinge:door.hinge,swing:door.swing,openFraction:door.openFraction,
   leaf},gap:pointToSegment(from,leaf),startStandable:stand(from),
  direct,firstStandable:stand(first),sweptProbes:candidates.length,
  twoLeg:candidates.filter(c=>c.nextClear).slice(0,12),
  worldJoins:candidates.filter(c=>c.routeLength>0).slice(0,12),
  shortSwept:candidates.slice(0,12),bypass
 }));
 assert.ok(candidates.length>0,'actual body has at least one legal departure');
});
