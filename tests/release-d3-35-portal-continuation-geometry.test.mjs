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
import {certifiedFollowOnPortalPrefix,noteAcceptedRehearsedPortal,
 noteAcceptedFollowOnPortal,protectedRehearsedFollowOnDoor,
 claimActualShovePortalRetry}
 from '../src/breach-rehearsed-portal-continuation.ts';
import {canAutoOpenEnRoute} from '../src/breach-door.ts';
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
  const certified=certifiedFollowOnPortalPrefix(
    stage,c.original,route,session.doors,
    (a,b,doors)=>sweptBodyClear(a,b,doors,OPERATOR_RADIUS,world),
    door=>!door.locked&&!door.jammed&&!door.wedged&&
      !door.heldBy&&(door.openFraction??(door.open?1:0))<.72&&
      canAutoOpenEnRoute({kind:'move'},door.id));
  const normal=routeWithNormalWorld(stage,c.original,session.doors,world);
  const exact=routeWithSqueezeWorld(stage,c.original,session.doors,world);
  results.push({
   stage:xy(stage),span:f(d(c.from,stage)),
   leafGap:f(pointToSegment(stage,doorLeafSegment(leaf))),
   nextPortal:route.length,certified:certified.length,
   portalFirst:xy(route[0]),portalLast:xy(route.at(-1)),
   firstSweep:route[0]?sweep(stage,route[0]):null,
   portalLength:route.reduce((sum,p,i)=>sum+
     d(i?route[i-1]:stage,p),0).toFixed(1),
   normal:normal.length,world:exact.length,
   worldFirst:xy(exact[0]),worldLast:xy(exact.at(-1))
  });
 }
 assert.ok(results.some(x=>x.certified>0),
  'at least one full-body certified future-door route MUST exist');
 console.log('D335_POST_PORTAL_WORLD',JSON.stringify({
  kind:c.kind,seed:c.seed,goal:c.original,from:c.from,
  standFrom:stand(c.from),standPortal:stand(c.portal),
  directSwept:sweep(c.from,c.original),results:results.slice(0,25)
 }));
 assert.ok(session.doors.length>0);
 assert.ok(results.length>0,'the actual portal footprint is physically valid');
});


test('D3.35 P4 crossed open-leaf lease never overrides physical contact/door',()=>{
 const door={
  id:'FRONT',kind:'hinged',
  a:{x:200,y:130},b:{x:200,y:172},
  open:true,openFraction:1.55,angularVelocity:0,
  locked:false,jammed:false,wedged:false,heldBy:null
 };
 const goal={x:350,y:180};
 const a={
  side:'blue',p:{x:170,y:150},
  plan:[{id:42,kind:'move',p:goal}],nav:[],
  blockedTime:0,traversal:null,traversalPending:false,squeeze:false,
  autoSidestep:null,fireRetreatTarget:null,doorTraversal:null
 };
 const portal={x:223,y:160};
 // The actual D2 source observer only accepts a rehearsal from
 // opposite side to goal, ending on that goal side.
 noteAcceptedRehearsedPortal(a,door,goal,portal,6);
 a.p={x:222,y:160};
 a.nav=[{x:238,y:168},{x:288,y:184}];
 noteAcceptedFollowOnPortal(a,8);
 assert.equal(protectedRehearsedFollowOnDoor(a,[door],8.05),'FRONT');
 a.p={x:170,y:150};
 assert.equal(protectedRehearsedFollowOnDoor(a,[door],8.06),'FRONT',
  'a still-swept route may lawfully return through the already-open leaf');
 a.p={x:222,y:160};
 const oldNav=a.nav;
 a.nav=[...oldNav];
 assert.equal(protectedRehearsedFollowOnDoor(a,[door],8.1),null,
  'a replaced transient route is NOT protected');
 a.nav=oldNav;
 noteAcceptedFollowOnPortal(a,8.2);
 a.blockedTime=.25;
 assert.equal(protectedRehearsedFollowOnDoor(a,[door],8.3),null,
  'real contact immediately restores previous doorway authority');
 a.blockedTime=0;
 noteAcceptedFollowOnPortal(a,8.4);
 a.plan=[{id:43,kind:'move',p:goal}];
 assert.equal(protectedRehearsedFollowOnDoor(a,[door],8.5),null,
  'new authored order restores normal episode selection');
 a.plan=[{id:42,kind:'move',p:goal}];
 noteAcceptedFollowOnPortal(a,8.6);
 assert.equal(protectedRehearsedFollowOnDoor(a,
  [{...door,locked:true}],8.7),null,'a locked door is never protected');
});


test('D3.35 P8 real actor-owned furniture shove gives ONE cold new-world door prefix',()=>{
 const door={
  id:'FRONT',kind:'hinged',
  a:{x:160,y:244},b:{x:160,y:286},
  open:true,openFraction:1.55,angularVelocity:0,
  locked:false,jammed:false,wedged:false,heldBy:null
 };
 const goal={x:267,y:296.68};
 const a={
  side:'blue',p:{x:135,y:252},
  plan:[{kind:'move',id:42,p:goal}],nav:[],
  blockedTime:0,traversal:null,traversalPending:false,
  squeeze:false,autoSidestep:null,fireRetreatTarget:null,
  doorTraversal:null,lastAutoShoveAt:-100
 };
 const portal={x:178,y:275};
 noteAcceptedRehearsedPortal(a,door,goal,portal,7);
 a.p={x:175,y:275};
 a.nav=[{x:184,y:280},{x:200,y:296},{x:232,y:416}];
 noteAcceptedFollowOnPortal(a,9.13,0);
 a.p={x:194.42,y:298.78};
 a.nav=[];
 a.lastAutoShoveAt=9.92;
 assert.equal(claimActualShovePortalRetry(a,[door],goal,9.93,0),false,
  'unchanged actual world has no cold-shove authority');
 assert.equal(claimActualShovePortalRetry(a,[{...door,locked:true}],
  goal,9.93,1),false,'locked old leaf cannot be claimed as crossed');
 assert.equal(claimActualShovePortalRetry(a,[door],goal,9.93,1),true,
  'real actor shove plus revision gives one new physical-world route query');
 assert.equal(claimActualShovePortalRetry(a,[door],goal,9.94,1),false,
  'no repeated world search on the same cover change');
});
