import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planMoveStroke,planWatch,undoPlan,redoPlan}
 from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {intelPassable} from '../src/breach-intel.ts';
const scene={
 seed:2323,name:'D3.23 FULL BODY DRAG LANDING',training:true,layout:'corridor',
 rooms:[],roomCount:0,doors:[],cover:[],windows:[],
 walls:[{a:{x:180,y:75},b:{x:180,y:200}}],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:115,y:215},{x:135,y:240},{x:145,y:265}],
 enemies:[],objective:{x:300,y:120},extract:{x:300,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:320}
};
const make=(intel='full-view')=>
 newSession(0,undefined,intel,'standard','hold',scene);
const snapshot=actor=>JSON.parse(JSON.stringify(actor.plan));

test('D3.23 dragged wall cutoff parks actual full-body clearance, not only squeeze clearance',()=>{
 const s=make();
 try{
  const a=team(s)[0],out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:250,y:120}],
   false,true,out),'a safe prefix must remain executable');
  assert.equal(out.clipped,true);
  assert.ok(out.endpoint.x>150&&out.endpoint.x<178,
   'clipping stays near original drawn wall approach');
  assert.ok(intelPassable(out.endpoint,s.intel,OPERATOR_RADIUS),
   'the final MOVE node must have known whole-operator clearance');
  assert.deepEqual(a.plan.at(-1).p,out.endpoint);
  assert.ok(a.plan.some(n=>n.kind==='move'&&n.p.x===150),
   'intermediate user-authored path points remain intact');
 }finally{activateSite(null);}
});

test('D3.23 HERE keeps WATCH and retains one atomic undo for a clipped final GO',()=>{
 const s=make();
 try{
  const a=team(s)[0],aim={x:240,y:75};
  assert.ok(planWatch(s,a.id,aim,undefined,'here'));
  assert.ok(planMove(s,a.id,{x:145,y:145}));
  const before=snapshot(a),watchId=a.plan[0].id;
  const out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:145,y:120},{x:240,y:120}],
   false,true,out));
  assert.equal(out.clipped,true);
  assert.ok(intelPassable(out.endpoint,s.intel,OPERATOR_RADIUS));
  assert.equal(a.plan[0].id,watchId);
  assert.deepEqual(a.plan[0].aimPoint,aim);
  const after=snapshot(a);
  assert.ok(undoPlan(s,a.id));
  assert.deepEqual(snapshot(a),before);
  assert.ok(redoPlan(s,a.id));
  assert.deepEqual(snapshot(a),after);
 }finally{activateSite(null);}
});

test('D3.23 hidden world wall is not used to leak an unseen obstruction',()=>{
 const s=make('true-blind');
 try{
  s.intel.walls.clear();
  const a=team(s)[0],out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:230,y:120}],
   false,true,out));
  assert.equal(out.clipped,false);
  assert.deepEqual(out.endpoint,{x:230,y:120});
  assert.equal(s.intel.walls.size,0,'no world-truth intel pollution');
 }finally{activateSite(null);}
});

test('D3.23 rejected empty drag preserves previous route, ID and WATCH state',()=>{
 const s=make();
 try{
  const a=team(s)[0],aim={x:230,y:70};
  assert.ok(planWatch(s,a.id,aim,undefined,'here'));
  assert.ok(planMove(s,a.id,{x:145,y:145}));
  const before=snapshot(a),id=s.nextId;
  assert.equal(planMoveStroke(s,a.id,[{...a.p}],false,true),false);
  assert.deepEqual(snapshot(a),before);
  assert.equal(s.nextId,id);
 }finally{activateSite(null);}
});

import {generateSite} from '../src/breach-site.ts';
import {stepSession} from '../src/breach-game.ts';
import {doorLeafSegment,pointToSegment} from '../src/breach-core.ts';

for(const [seed,mission] of [[20,'capture'],[26,'clear']]){
 test('EQA1: seed '+seed+' '+mission+' cannot author a squeeze-only FRONT-adjacent final landing',()=>{
  const site=generateSite(seed,'small',undefined,{mission});
  const s=newSession(0,seed,'floor-plan','small',mission,site);
  try {
   const actors=team(s).slice(0,2);
   let verified=0,adjustedOrRejected=0;
   for(const actor of actors){
    const originalLength=actor.plan.length;
    const out={clipped:false,endpoint:{x:0,y:0}};
    const ok=planMoveStroke(s,actor.id,[site.entrance,site.objective],
      false,true,out);
    if(!ok){
     assert.equal(actor.plan.length,originalLength,
       'rejected move must be atomic');
     adjustedOrRejected++;
     continue;
    }
    verified++;
    assert.ok(intelPassable(out.endpoint,s.intel,OPERATOR_RADIUS),
      'every accepted drag must have whole-operator known final clearance');
    if(out.clipped)adjustedOrRejected++;
   }
   assert.ok(adjustedOrRejected>0,
      'the previously accepted squeeze-only approach must be corrected or refused');
   s.phase='running';s.started=true;
   let sameSideBlocking=0;
   for(let tick=0;tick<360;tick++){
    stepSession(s,1/30);
    for(const actor of actors){
     const leaf=s.doors.find(d=>d.id==='FRONT');
     if(leaf&&!leaf.open&&actor.lastBlocker==='door'&&
        actor.blockedTime>.35&&
        pointToSegment(actor.p,doorLeafSegment(leaf))<OPERATOR_RADIUS+1)
       sameSideBlocking++;
    }
   }
   assert.ok(sameSideBlocking<180,
      'should not repeat a ten-second FRONT-leaf blocked MOVE');
  }finally{activateSite(null);}
 });
}
