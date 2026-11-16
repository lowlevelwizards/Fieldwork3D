import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';

/** Pre-E4.C query preserved independently as the compatibility oracle. */
function legacyTouchdowns(archive,from,to,ids){
 const out=[];
 if(to<=from)return out;
 const actors=new Map(archive.actors.map(actor=>[actor.id,actor]));
 for(const id of ids){
  const actor=actors.get(id);if(!actor)continue;
  for(let foot=0;foot<2;foot++){
   const entries=actor.feet[foot];
   for(let n=entries.length-1;n>=0;n--){
    const event=entries[n],at=event.at+event.unload+event.swing;
    if(at<=from)break;
    if(event.swing>0&&at<=to)out.push({
     id,foot,at,position:{...event.to}
    });
   }
  }
 }
 return out.sort((a,b)=>a.at-b.at);
}
const event=(at,swing=0.035,label=0)=>({
 at,unload:0.013,swing,landing:0.025,recovery:0.025,lift:3.4,
 from:{x:at*3+label,y:label},to:{x:at*4+label,y:label+1},
 fromYaw:0,toYaw:.15
});
const track=(id,feet)=>({
 id,feet,travelYaw:0,
 travelYawEvents:[{at:0,yaw:0}],
 pelvisYawEvents:[{at:0,yaw:0}],
 accelEvents:[{at:0,acceleration:0}]
});
function archive(actors){
 return {schemaVersion:1,actors,doors:[{id:'gate',events:[
  {at:0,fraction:0},{at:1,fraction:.65},{at:2,fraction:1}
 ]}]};
}
function checkIntervals(input,intervals){
 const rec=new ReplayMotionRecorder();
 rec.loadArchive(input);
 const before=rec.toArchive();
 assert.deepEqual(before,input,'archive V1 must be reproduced unchanged');
 for(const [from,to] of intervals){
  for(const ids of [['rook'],['moss'],['rook','moss'],['moss','rook'],
   ['rook','missing','rook']]){
   const actual=rec.touchdownsBetween(from,to,ids);
   assert.deepEqual(actual,legacyTouchdowns(input,from,to,ids),
    'interval '+from+' to '+to+' ids '+ids);
   assert.deepEqual(rec.touchdownsBetween(from,to,ids),actual,
    'repeated query must not move read cursors');
  }
 }
 assert.deepEqual(rec.toArchive(),before,
  'seeking backwards/forwards cannot mutate historical streams');
 const fresh=new ReplayMotionRecorder();
 fresh.loadArchive(rec.toArchive());
 for(const [from,to] of intervals)
  assert.deepEqual(fresh.touchdownsBetween(from,to,['rook','moss']),
   rec.touchdownsBetween(from,to,['rook','moss']),
   'loaded historical archive differs');
 for(const t of [0,.05,.17,1.1,2.3,14.3,90]){
  assert.deepEqual(fresh.presentation(t,['rook','moss']),
   rec.presentation(t,['rook','moss']),
   'historical pose/door playback must not depend on seek order');
 }
}

test('E4.C chronological foot journals equal old scans across 2400 events, ties and seeks',()=>{
 const a=[event(0,0),...Array.from({length:1199},(_,i)=>
  event((i+1)*.075,i%17===0?0:.035,i))];
 const b=[event(0,0),...Array.from({length:1199},(_,i)=>
  event((i+1)*.075,i%9===0?0:.035,i))];
 const input=archive([
  track('rook',[a,b]),
  track('moss',[a.map(e=>({...e,to:{...e.to}})),
   b.map(e=>({...e,to:{...e.to}}))])
 ]);
 const intervals=[
  [-1,0],[0,0],[0,.001],[0,.03],[.01,.1],[.075,.075],
  [.075,.11],[3.2,3.27],[10.5,10.51],[30,30.01],
  [88.0001,88.0002],[89.9,90],[90,1],[88,89],[0,90],
  [1,90],[90,91],[90,Infinity],[NaN,1],[0,NaN]
 ];
 checkIntervals(input,intervals);
});

test('E4.C reordered, duplicated and nonfinite legacy contacts preserve reverse scan',()=>{
 const a=[event(0,0),event(.3),event(.1),event(.4),
  event(.4),event(.35),event(.6,0),event(.75)];
 const b=[event(0,0),event(.15),event(Number.NaN),
  event(.5),event(.3),event(.7)];
 const input=archive([
  track('rook',[a,b]),
  track('moss',[[event(0,0),event(.2),event(.1)],
   [event(0,0),event(.3),event(.8)]])
 ]);
 checkIntervals(input,[
  [-1,.1],[0,.01],[0,.2],[.1,.3],[.3,.45],
  [.45,.76],[.45,1],[0,1],[1,0],[NaN,1],
  [0,NaN],[.3,Infinity]
 ]);
});

test('E4.C live 60 Hz contact intervals match historical reverse-scan after recording',()=>{
 const s=newSession(0,212),actor=s.operators[0];
 const recorder=new ReplayMotionRecorder();
 const start={...actor.p};
 for(let i=0;i<=240;i++){
  const time=i/60;
  actor.p={x:start.x+time*28,y:start.y+Math.sin(time*1.7)*3};
  actor.velocity=i%35<4?0:28;
  actor.heading=i%60<30?0:.2;
  actor.pace=i%100<9?'run':'walk';
  recorder.record(time,[actor],s.doors);
 }
 const input=recorder.toArchive();
 assert.ok(input.actors[0].feet.some(f=>f.length>2),
  'real fixed-step planner should record multiple contact events');
 const intervals=[[0,4],[0,.4],[.4,.45],[.9,1.1],
  [1.1,.9],[2.5,2.8],[3.8,4],[4,4],[4,Infinity]];
 for(const [from,to] of intervals){
  assert.deepEqual(recorder.touchdownsBetween(from,to,[actor.id]),
   legacyTouchdowns(input,from,to,[actor.id]));
 }
 const restored=new ReplayMotionRecorder();
 restored.loadArchive(input);
 for(const [from,to] of intervals)
  assert.deepEqual(restored.touchdownsBetween(from,to,[actor.id]),
   recorder.touchdownsBetween(from,to,[actor.id]));
});

test('E4.C changing swing duration can reorder touchdowns despite ordered event starts',()=>{
 // A long planned swing may land after a later short swing. Never infer
 // contact monotonicity from event.at alone when accepting old V1 films.
 const feet=[event(0,0),event(.1,.7),event(.2,.02),
  event(.3,.03),event(.4,.015)];
 const input=archive([
  track('rook',[feet,[event(0,0),event(.12,.01)]]),
  track('moss',[[event(0,0),event(.35,.02)],
   [event(0,0),event(.15,.02)]])
 ]);
 checkIntervals(input,[[0,.2],[0,.3],[.2,.5],[.5,.85],
  [0,1],[.31,.41],[.8,.86],[.95,2],[2,0]]);
});
