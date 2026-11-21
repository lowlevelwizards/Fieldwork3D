/** D3.31: 93.1%-open self-blocked leaf must still permit a REAL swept
 * clearance proposal, but never grant passage, door swing or authored GO.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {doorWouldStrikeActors} from '../src/breach-door.ts';
import {doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {openingSweepThreatens,upcomingOpeningSweep}
 from '../src/breach-door-opening-footwork.ts';
import {shouldStageForOpening} from '../src/breach-door-opening-ownership.ts';
const p=(x,y)=>({x,y});

test('D3.31 archive: physical Townhouse FRONT at 0.931 still threatens its own lead',()=>{
 const site=generateSite(13946496,'small',undefined,{mission:'intel'},
  {archetype:'townhouse'});
 const door=site.doors.find(d=>d.id==='FRONT');
 assert.ok(door&&door.kind==='hinged');
 // Exact body from the 45-second frozen witness: Rook stayed at this
 // almost unchanged coordinate, while this same hinge was stationary.
 const body=p(264.2860269792871,98.59131269382668);
 const stopped={...door,open:true,openFraction:.931,
  angularVelocity:0,locked:false,jammed:false,wedged:false,heldBy:null};
 assert.equal(doorWouldStrikeActors(stopped,
  Math.min(1,.931+.025),[body],OPERATOR_RADIUS),true,
  'frozen physical body itself prevented the rest of the hinge opening');
 assert.equal(openingSweepThreatens(stopped,body),true,
  '0.72 is not a physical release when the remaining leaf hits this body');
 const alreadyOpen={...stopped,openFraction:1.0};
 assert.equal(openingSweepThreatens(alreadyOpen,body),false);
 const swinging={...stopped,angularVelocity:.4};
 assert.equal(openingSweepThreatens(swinging,body),false,
  'do not stage against a normally moving open leaf');
 const locked={...stopped,locked:true};
 assert.equal(openingSweepThreatens(locked,body),false,
  'locked leaf grants no movement or geometry exemption');
 assert.deepEqual(site.doors.find(d=>d.id==='FRONT'),door,
  'pure predicates do not modify the actual map door');
});

test('D3.31 ordinary fully open passage stays independent of manipulation-owner',()=>{
 const door={id:'FRONT',kind:'hinged',hinge:'a',swing:1,
  a:p(0,0),b:p(0,42),open:true,openFraction:1.55,
  pushTarget:1.55,angularVelocity:0,locked:false,jammed:false,
  wedged:false,heldBy:null};
 const body=doorLeafSegment(door).b;
 assert.equal(openingSweepThreatens(door,body),false);
 assert.ok(upcomingOpeningSweep(door)>=door.openFraction);
 const s={seconds:0,doors:[door],operators:[]};
 const a={id:'rook',side:'blue',health:4,
  plan:[{kind:'move',id:1,p:p(50,50)}],p:body};
 assert.equal(shouldStageForOpening(s,a,door),false,
  'follower rank and WAIT gate are unchanged for an open aperture');
});
