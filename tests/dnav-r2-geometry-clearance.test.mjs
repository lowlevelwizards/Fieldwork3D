import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {initDoor,doorClear,doorWouldStrikeActors,doorSwingBlocked,
 doorApproach} from '../src/breach-door.ts';

const make=(hinge='a',swing=-1)=>initDoor({
 id:'DNAV-R2',a:{x:290,y:260},b:{x:332,y:260},
 hinge,swing,kind:'hinged',open:true,openedAt:0
},0);
const siteFor=door=>({
 seed:100,doors:[door],walls:[],cover:[],
 bounds:{minX:0,minY:0,maxX:640,maxY:600}
});
test('R2a: a moving hinge cannot tunnel over an actor between valid endpoints',()=>{
 const door=make();
 door.openFraction=0;
 const actor={x:316,y:286};
 const old=doorLeafSegment(door);
 const end=doorLeafSegment({...door,openFraction:1.2});
 assert.ok(pointToSegment(actor,old)>OPERATOR_RADIUS+1);
 assert.ok(pointToSegment(actor,end)>OPERATOR_RADIUS+1);
 assert.equal(doorWouldStrikeActors(door,1.2,[actor]),true);
 assert.equal(doorWouldStrikeActors(door,1.2,[{x:390,y:390}]),false);
});
test('R2a: thin architectural fixtures stop the intermediate hinge swing',()=>{
 const door=make();
 door.openFraction=0;
 const site=siteFor(door);
 site.cover=[{x:316,y:286,w:4,h:4}];
 activateSite(site);
 try{
  assert.equal(doorSwingBlocked(door,1.2),true);
 }finally{activateSite(null);}
});
test('R2b: full-body gate honors real clearance for either hinge and swing',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const door=make(hinge,swing);
  activateSite(siteFor(door));
  try{
   door.openFraction=.08;
   assert.equal(doorClear(door),false,
     'a crack is not traversable: '+hinge+','+swing);
   door.openFraction=1;
   assert.equal(doorClear(door),true,
     'an open full-width threshold is traversable: '+hinge+','+swing);
  }finally{activateSite(null);}
 }
});
test('R2b: opening percentages never bypass a body-narrow door frame',()=>{
 const door=make();
 door.b.x=door.a.x+15;
 door.openFraction=1.3;
 activateSite(siteFor(door));
 try{
  assert.equal(doorClear(door),false);
 }finally{activateSite(null);}
});
test('R2c: staging positions never embed an operator into an open leaf',()=>{
 const door=make();
 door.openFraction=.68;
 activateSite(siteFor(door));
 try{
  const from={x:308,y:211};
  const staging=doorApproach(from,door);
  assert.ok(staging,'expected an accessible staging point');
  assert.ok(pointToSegment(staging,doorLeafSegment(door))>=OPERATOR_RADIUS+1);
 }finally{activateSite(null);}
});
