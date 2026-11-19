/** EQA3.13 controlled fixed-tick encounter witnesses, not an assertion
 * that arbitrary AI encounters inevitably produce real gunfire. A scripted
 * audible shot tests evidence, physical movement, replay and debrief through
 * the actual Session owner without altering its gameplay policies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {newSession,team,toggling,stepSession,debrief}
 from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

const pt=(x,y)=>({x,y});
const site=(seed)=>({
 seed,name:'EQA3.13 controlled populated rescue hall',
 layout:'corridor',rooms:[{id:'hall',x:80,y:140,w:420,h:210,
  kind:'room',purpose:'hall',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[pt(120,200),pt(120,240),pt(120,280),pt(120,320)],
 entrance:pt(120,200),objective:pt(470,185),extract:pt(130,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function run(seed,count){
 const s=newSession(0,seed,'floor-plan','small','rescue',site(seed),
  {enableCivilians:true});
 try{
  const players=team(s);
  assert.equal(players.length,4);
  const rescue=s.civilians.find(c=>c.rescueTarget);
  assert.ok(rescue,'real physical rescue mission must own a neutral person');
  const crowd=Array.from({length:count},(_,i)=>createCivilian({
    id:'civ:eqa313:'+seed+':'+i,
    role:'visitor',
    persona:['steady','cautious','startled'][i%3],
    activity:'idle',position:pt(230+i*35,210+(i%2)*68),
    heading:0,roomId:'hall',
    appearanceSeed:seed*17+i*19
  }));
  s.civilians.push(...crowd);
  const initial=snapshot(s);
  const touched=new Set();
  let biggestStep=0;
  toggling(s);
  for(let tick=0;tick<150&&s.phase==='running';tick++){
   if(tick===10)s.noise.push({
    id:100000+seed,p:pt(320,235),radius:200,
    time:s.seconds,kind:'gunshot'
   });
   const positions=new Map(crowd.map(c=>[c.id,{...c.p}]));
   stepSession(s,1/60);
   for(const c of crowd){
    const start=positions.get(c.id);
    const moved=Math.hypot(c.p.x-start.x,c.p.y-start.y);
    biggestStep=Math.max(biggestStep,moved);
    assert.ok(Number.isFinite(c.p.x)&&Number.isFinite(c.p.y));
    assert.ok(Number.isFinite(c.fear));
    assert.ok(moved<=2.5,'no civilian can teleport on one real 60Hz step');
    if(c.lastEvidenceAt>=0)touched.add(c.id);
   }
  }
  const captured=snapshot(s);
  assert.equal(s.civilians.length,count+1,'population conserved');
  assert.ok(s.seconds>=.3,'actual simulation advanced beyond scripted contact');
  assert.ok(touched.size>=2,
   'audibly exposed civilians should actually perceive a scripted shot');
  assert.ok(biggestStep<2.5);
  const outcome=debrief(s);
  assert.ok(Number.isFinite(outcome.score));
  assert.ok(outcome.civilianContact);
  const expected=captured.civilians.map(c=>({
    id:c.id,p:c.p,state:c.state,threatEstimate:c.threatEstimate,
    lastFlinchAt:c.lastFlinchAt
  }));
  applyReplayFrame(s,initial);
  assert.deepEqual(s.civilians.map(c=>c.p),
    initial.civilians.map(c=>c.p),'rewind restores the whole crowd');
  applyReplayFrame(s,captured);
  assert.deepEqual(s.civilians.map(c=>({
    id:c.id,p:c.p,state:c.state,threatEstimate:c.threatEstimate,
    lastFlinchAt:c.lastFlinchAt
  })),expected,'seek restores physical and evidentiary civilian state');
  return {
    seed,count,seconds:Number(captured.t.toFixed(3)),heard:touched.size,
    changed:captured.civilians.filter(c=>!c.rescueTarget&&
      c.state!=='routine').length,
    debrief:outcome.civilianContact
  };
 }finally{activateSite(null);}
}
for(const [seed,count] of [[1313,4],[1317,6]]){
 test('EQA3.13 real fixed-tick populated rescue session '+seed+
  ' / '+count+' civilians',()=>{
  const result=run(seed,count);
  assert.equal(result.count,count);
  assert.ok(result.changed>0,'some exposed civilians must react to real audible evidence');
 });
}
