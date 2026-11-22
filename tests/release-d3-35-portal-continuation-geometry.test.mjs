/** D3.35 P2: LIVE geometry at frozen end-state leaf angles, with no
 * mutation of a gameplay actor/door lock or authored order.
 * Demonstrates whether a physically legal continuation exists AFTER the
 * post-rehearsal portal foothold, rather than sending the actor back
 * through the already fully open same door.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {routeWithSqueezeWorld,routeWithNormalWorld,
 routeToNextOperableDoor} from '../src/breach-squeeze-route.ts';

const f=n=>Math.round(n*100)/100;
const xy=p=>p&&({x:f(p.x),y:f(p.y)});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fixtures=[
 {kind:'garage',seed:14354241,scale:'standard',
  original:{x:267,y:296.68},
  from:{x:175.28,y:274.57},portal:{x:178,y:274.68},
  open:[['FRONT',1.55],['SHUTTER',1]]},
 {kind:'warehouse',seed:14381424,scale:'standard',
  original:{x:514.3,y:585},
  from:{x:294.45,y:175.72},portal:{x:294.32,y:178},
  open:[['FRONT',1.55],['D5',1.55],['D6',1],
    ['D8',1],['SERVICE',1.55]]}
];
for(const c of fixtures)test('D3.35 P2 '+c.kind+
 ' cold real-body continuation after repeated FRONT rehearsal',()=>{
 const site=generateSite(c.seed,c.scale,undefined,
  {mission:'intel'},{archetype:c.kind});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,c.seed,'full-view',c.scale,'intel',quiet,
  {enableCivilians:false});
 const open=new Map(c.open);
 for(const door of session.doors){
  const fraction=open.get(door.id);
  if(fraction!==undefined)Object.assign(door,{
   open:true,openFraction:fraction,pushTarget:fraction,
   angularVelocity:0,heldBy:null});
 }
 const world=sessionWorldGeometry(session);
 const stand=p=>bodyClear(p,session.doors,OPERATOR_RADIUS,world);
 const sweep=(a,b)=>sweptBodyClear(a,b,session.doors,OPERATOR_RADIUS,world);
 const leaf=session.doors.find(x=>x.id==='FRONT');
 const roots=[
  c.from,c.portal,
  ...[6,12,20,30].flatMap(r=>[0,Math.PI/8,-Math.PI/8,
    Math.PI/4,-Math.PI/4].map(offset=>{
    const theta=Math.atan2(c.original.y-c.from.y,
      c.original.x-c.from.x)+offset;
    return {x:c.from.x+Math.cos(theta)*r,
      y:c.from.y+Math.sin(theta)*r};
  }))
 ];
 const results=[];
 for(const stage of roots){
  if(!stand(stage)||!sweep(c.from,stage))continue;
  const route=routeToNextOperableDoor(stage,c.original,session.doors,world);
  const normal=routeWithNormalWorld(stage,c.original,session.doors,world);
  const exact=routeWithSqueezeWorld(stage,c.original,session.doors,world);
  results.push({
   stage:xy(stage),span:f(d(c.from,stage)),
   leafGap:f(pointToSegment(stage,doorLeafSegment(leaf))),
   nextPortal:route.length,
   portalFirst:xy(route[0]),portalLast:xy(route.at(-1)),
   firstSweep:route[0]?sweep(stage,route[0]):null,
   portalLength:route.reduce((sum,p,i)=>sum+
     d(i?route[i-1]:stage,p),0).toFixed(1),
   normal:normal.length,world:exact.length,
   worldFirst:xy(exact[0]),worldLast:xy(exact.at(-1))
  });
 }
 console.log('D335_POST_PORTAL_WORLD',JSON.stringify({
  kind:c.kind,seed:c.seed,goal:c.original,from:c.from,
  standFrom:stand(c.from),standPortal:stand(c.portal),
  directSwept:sweep(c.from,c.original),results:results.slice(0,25)
 }));
 assert.ok(session.doors.length>0);
 assert.ok(results.length>0,'the actual portal footprint is physically valid');
});
