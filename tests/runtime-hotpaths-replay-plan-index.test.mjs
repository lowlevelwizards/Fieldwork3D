import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayPlanRecorder} from '../src/breach-replay-plans.ts';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

function revision(index,actorId,tick,hasPlan=true){
  return {
    revisionId:index+1,tick,order:index,actorId,
    phase:'planning',origin:{x:index,y:0},
    nodes:hasPlan?[{id:index+1,kind:'move',p:{x:index,y:0}}]:[]
  };
}
function historicalLookup(revisions,actorId,tick,order=Infinity){
  let result=null;
  for(const revision of revisions){
    if(revision.tick>tick)break;
    if(revision.actorId===actorId&&
       (revision.tick<tick||revision.order<=order))result=revision;
  }
  return result;
}
test('indexed historical plan seeks exactly preserve global scan and same-tick order',()=>{
  const recorder=new ReplayPlanRecorder(),actors=['a','b','c'];
  for(let i=0;i<2400;i++)
    recorder.revisions.push(revision(i,actors[i%3],Math.floor(i/5),
      i%11!==0));
  for(const actorId of [...actors,'missing']){
    for(let tick=-1;tick<490;tick+=7)
      for(const order of [Infinity,0,31,256,1800]){
        assert.strictEqual(recorder.at(actorId,tick,order),
          historicalLookup(recorder.revisions,actorId,tick,order));
      }
    assert.strictEqual(recorder.initial(actorId),
      recorder.revisions.find(r=>r.actorId===actorId&&r.nodes.length>0)??null);
  }
  // Restored archives append records directly; no extra restore API needed.
  const later=revision(2400,'a',480);
  recorder.revisions.push(later);
  assert.strictEqual(recorder.at('a',480),later);
  recorder.revisions.length=0;
  assert.equal(recorder.at('a',480),null,'clearing a restored film resets index');
});
test('nonmonotonic legacy archive preserves original stop-on-future rule',()=>{
  const recorder=new ReplayPlanRecorder();
  recorder.revisions.push(revision(0,'a',0),revision(1,'a',8),
    revision(2,'a',3),revision(3,'b',2));
  for(const tick of [0,2,3,5,8])
    assert.strictEqual(recorder.at('a',tick),
      historicalLookup(recorder.revisions,'a',tick));
});
test('live empty plans skip duplicates; in-place same-tick edits are captured',()=>{
  try{
    const s=newSession(0,294),friendly=team(s)[0];
    const recorder=new ReplayPlanRecorder();
    recorder.capture(s);
    const n=recorder.revisions.length;
    for(let i=0;i<200;i++)recorder.capture(s);
    assert.equal(recorder.revisions.length,n);
    friendly.plan=[{id:915,kind:'move',p:{x:80,y:120}}];
    recorder.capture(s);
    const authored=recorder.at(friendly.id,0);
    assert.equal(authored?.nodes[0].p.x,80);
    friendly.plan[0].p.x=140;
    recorder.capture(s);
    assert.equal(recorder.at(friendly.id,0)?.nodes[0].p.x,140);
    assert.equal(authored?.nodes[0].p.x,80,
      'archived plan snapshots must not be mutated with live orders');
    const last=recorder.revisions.length;
    friendly.plan=[];
    recorder.capture(s);
    assert.equal(recorder.revisions.length,last+1);
    for(let i=0;i<200;i++)recorder.capture(s);
    assert.equal(recorder.revisions.length,last+1);
  }finally{activateSite(null);}
});
