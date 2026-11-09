import test from 'node:test';
import assert from 'node:assert/strict';
import {recordAuthoritativeScenario} from './fixtures/breach-scenario-recording.mjs';
import {WALLS,COVER,activateSite,activeSite} from '../src/breach-core.ts';

const makeSite=()=>({
 seed:19,name:'ROADMAP3 DOORWAY',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[{a:{x:90,y:260},b:{x:290,y:260}},
  {a:{x:332,y:260},b:{x:550,y:260}}],
 doors:[{id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'}],
 cover:[],entrance:{x:310,y:260},
 spawn:[{x:300,y:200},{x:308,y:173},
  {x:316,y:146},{x:325,y:119}],
 enemies:[],windows:[],
 objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
});
function traverse(s,{team,planMove,planWaitAt}){
 const [rook,moss]=team(s);
 assert.ok(planWaitAt(s,rook.id,1,'here'));
 assert.ok(planMove(s,rook.id,{x:296,y:373}));
 assert.ok(planMove(s,moss.id,{x:320,y:380}));
}
test('identical 60 Hz doorway and WAIT scenarios have identical entire state fingerprints',()=>{
 const input={site:makeSite(),ticks:360,sampleEvery:20,configure:traverse};
 const a=recordAuthoritativeScenario(input);
 const b=recordAuthoritativeScenario({...input,site:makeSite()});
 assert.equal(a.fingerprint,b.fingerprint);
 assert.deepEqual(a.samples,b.samples);
 assert.ok(a.samples.some(f=>f.operators.some(o=>o.plan.length>0)));
 assert.ok(a.samples[0].doors.some(d=>d.open===false));
 assert.ok(a.samples.some(f=>f.doors.some(d=>d.open===true)),
  'the real door motor should eventually open the entrance');
});
test('distinct authored orders produce distinct fingerprints without changing simulation seeds',()=>{
 const base={site:makeSite(),ticks:180,configure:traverse};
 const one=recordAuthoritativeScenario(base);
 const two=recordAuthoritativeScenario({...base,site:makeSite(),
  configure(s,api){
   traverse(s,api);
   const actor=api.team(s)[2];
   assert.ok(api.planMove(s,actor.id,{x:310,y:355}));
  }});
 assert.notEqual(one.fingerprint,two.fingerprint);
 assert.equal(one.samples[0].rng,two.samples[0].rng);
});
test('scenario geometry scopes preserve a displaced live mission, including after errors',()=>{
 const live=makeSite(),original={...live.cover};
 live.cover=[{x:150,y:190,w:25,h:25,low:true}];
 activateSite(live);
 try{
  COVER.splice(0,1,{...COVER[0],x:160});
  const beforeWalls=[...WALLS],beforeCover=[...COVER];
  recordAuthoritativeScenario({site:makeSite(),ticks:12,configure:traverse});
  assert.equal(activeSite(),live);
  assert.deepEqual(WALLS,beforeWalls);
  assert.deepEqual(COVER,beforeCover);
  assert.throws(()=>recordAuthoritativeScenario({
    site:makeSite(),configure(){throw Error('intentional failure');}
  }),/intentional failure/);
  assert.equal(activeSite(),live);
  assert.deepEqual(COVER,beforeCover);
 }finally{activateSite(null);}
});
