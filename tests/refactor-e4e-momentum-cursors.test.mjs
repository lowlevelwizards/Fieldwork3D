import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
import {newSession} from '../src/breach-game.ts';
import {indexMovementImpulses,movementImpulseSample,sampleMovementImpulses}
  from '../src/breach-motion-transitions.ts';

/** Pre-E4.E binary-search and spring envelope, independent of the cursor
 * implementation under test. Keep operation order to protect exact output.
 */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=n=>{const x=clamp(n,0,1);return x*x*(3-2*x)};
function originalSample(events,time,duration){
 if(!events.length||time<events[0].at)return 0;
 let lo=0,hi=events.length-1;
 while(lo<hi){
  const mid=Math.ceil((lo+hi)/2);
  if(events[mid].at<=time)lo=mid;else hi=mid-1;
 }
 const age=time-events[lo].at;
 if(age<0||age>=duration)return 0;
 return events[lo].strength*(1-smooth(age/duration));
}
const originalMomentum=(drive,brake,time)=>({
 drive:originalSample(drive,time,.26),
 brake:originalSample(brake,time,.38)
});
function rightBiased(events,time){
 let lo=0,hi=events.length-1;
 while(lo<hi){
  const mid=Math.ceil((lo+hi)/2);
  if(events[mid].at<=time)lo=mid;else hi=mid-1;
 }
 return lo;
}
const footAt=(at)=>({at,from:{x:0,y:0},to:{x:0,y:0},
 fromYaw:0,toYaw:0,unload:0,swing:0,lift:0,landing:0,recovery:0});
const entry=(id,samples)=>({
 id,feet:[[footAt(0)],[footAt(0)]],travelYaw:0,
 travelYawEvents:[{at:0,yaw:0}],pelvisYawEvents:[{at:0,yaw:0}],
 accelEvents:samples
});
const archive=entries=>({schemaVersion:1,actors:entries,doors:[]});
const sampleSeries=(n,offset=0)=>Array.from({length:n},(_,i)=>({
 at:i===0?0:i%27===0?(i-1)*.05:i*.05+offset,
 acceleration:i%7===0?0:i%2===0?190:-185
}));
function assertStreamParity(input,ids){
 const rec=new ReplayMotionRecorder();
 rec.loadArchive(input);
 const initial=structuredClone(input);
 const times=[-10,-.001,0,.001,.025,.05,.2,.26,.38,5,14.9,
  31.1,59,100,Infinity,-Infinity,NaN,20,4,42,0,60];
 for(let i=0;i<150;i++)times.push(i%5===0?50-i*.13:
   i%3===0?i*.041:20+i/60);
 const tracks=new Map(input.actors.map(a=>[a.id,indexMovementImpulses(a.accelEvents)]));
 for(const time of times){
  for(const includeDoors of [false,true]){
   const actual=rec.presentation(time,ids,includeDoors).momentum;
   for(const id of ids){
    const indexed=tracks.get(id);if(!indexed)continue;
    const expected=originalMomentum(indexed.drive,indexed.brake,time);
    assert.deepEqual(actual[id],expected,
      'replay impulse changed for '+id+' at '+time);
   }
  }
 }
 assert.deepEqual(rec.toArchive(),initial,
  'scrubbing and sampling must never change V1 evidence');
 rec.loadArchive(input);
 for(const time of [0,.38,30,10])
  for(const id of ids){
   const indexed=tracks.get(id);if(!indexed)continue;
   assert.deepEqual(rec.presentation(time,[id],false).momentum[id],
    originalMomentum(indexed.drive,indexed.brake,time));
  }
}
test('E4.E direct impulse API retains original binary seek without cursor args',()=>{
 const drive=[{at:0,strength:.8},{at:.21,strength:.35},
  {at:.21,strength:.65},{at:1,strength:.2}];
 const brake=[{at:.05,strength:.7},{at:.39,strength:.5},
  {at:.44,strength:1}];
 for(const t of [-1,0,.05,.21,.22,.26,.38,.44,.7,1,2,
  Infinity,-Infinity,NaN]){
  assert.deepEqual(sampleMovementImpulses(drive,brake,t),
   originalMomentum(drive,brake,t));
  assert.deepEqual(sampleMovementImpulses(drive,brake,t,
   rightBiased(drive,t),rightBiased(brake,t)),
   originalMomentum(drive,brake,t));
  assert.deepEqual(movementImpulseSample(drive,t,.26),originalSample(drive,t,.26));
 }
 assert.deepEqual(sampleMovementImpulses([],[],.1),{drive:0,brake:0});
});
test('E4.E long chronological V1 acceleration history matches original momentum',()=>{
 const input=archive([
  entry('rook',sampleSeries(1200)),
  entry('moss',sampleSeries(1000,.02))
 ]);
 assertStreamParity(input,['rook','moss']);
});
test('E4.E legacy nonchronological and nonfinite impulses preserve original seek',()=>{
 const malformed=sampleSeries(520);
 malformed[200].at=-4;
 malformed[290].at=NaN;
 malformed[320].at=Infinity;
 // Duplicate times and out-of-order values are retained, never normalized.
 const mixed=sampleSeries(550,.02);
 mixed[260].at=1;
 mixed[390].at=Number.NaN;
 assertStreamParity(archive([entry('rook',malformed),
   entry('moss',mixed)]),['moss','rook']);
});
test('E4.E live 60Hz acceleration journal and archive replacement are unchanged',()=>{
 const session=newSession(0,212),actor=session.operators[0];
 const rec=new ReplayMotionRecorder(),start={...actor.p};
 for(let tick=0;tick<=240;tick++){
  const time=tick/60;
  actor.p={x:start.x+time*32,y:start.y+Math.sin(time)*4};
  actor.velocity=tick%46<7?0:tick%39<5?70:32;
  rec.record(time,[actor],session.doors);
  if(tick%11===0){
   const data=rec.toArchive();
   const indexed=indexMovementImpulses(
     data.actors.find(a=>a.id===actor.id).accelEvents);
   for(const seek of [time,time-.03,0,time+5,time*.5]){
    const observed=rec.presentation(seek,[actor.id],false).momentum[actor.id];
    assert.deepEqual(observed,
     originalMomentum(indexed.drive,indexed.brake,seek),
     'live append '+tick+' and seek '+seek);
   }
  }
 }
 const before=rec.toArchive();
 const second=archive([entry(actor.id,sampleSeries(100,.04))]);
 rec.loadArchive(second);
 const indexed=indexMovementImpulses(second.actors[0].accelEvents);
 assert.deepEqual(rec.presentation(1.5,[actor.id],false).momentum[actor.id],
  originalMomentum(indexed.drive,indexed.brake,1.5));
 assert.deepEqual(rec.toArchive(),second);
 const recovered=new ReplayMotionRecorder();
 recovered.loadArchive(before);
 assert.deepEqual(recovered.toArchive(),before);
});
test('E4.E adjacent-frame drive/brake samples reuse bounded timeline positions',()=>{
 const values=sampleSeries(2000);
 const rec=new ReplayMotionRecorder();
 rec.loadArchive(archive([entry('rook',values)]));
 const track=rec.actors.get('rook');
 assert.ok(track.driveEvents.length>200&&track.brakeEvents.length>200);
 let reads=0;
 for(const event of [...track.driveEvents,...track.brakeEvents]){
  const at=event.at;
  Object.defineProperty(event,'at',{configurable:true,
   get(){reads++;return at;}});
 }
 // First lookup establishes the monotonic history index only once.
 rec.presentation(50,['rook'],false);
 reads=0;
 for(let i=1;i<=120;i++)
  rec.presentation(50+i/60,['rook'],false);
 assert.ok(reads<120*11,
   'adjacent frames must inspect O(1) drive/brake dates, got '+reads);
 const base=indexMovementImpulses(values);
 for(const time of [0,2,10,99,25,50]){
  assert.deepEqual(rec.presentation(time,['rook'],false).momentum.rook,
   originalMomentum(base.drive,base.brake,time));
 }
});
test('E4.E independent recorders never share momentum history for same actor ID',()=>{
 const first=archive([entry('rook',sampleSeries(800))]);
 const second=archive([entry('rook',sampleSeries(800,.029))]);
 const a=new ReplayMotionRecorder(),b=new ReplayMotionRecorder();
 a.loadArchive(first);b.loadArchive(second);
 const ai=indexMovementImpulses(first.actors[0].accelEvents);
 const bi=indexMovementImpulses(second.actors[0].accelEvents);
 for(const time of [3.1,20,12.2,50,3.13,.05,0,22]){
  assert.deepEqual(a.presentation(time,['rook'],false).momentum.rook,
   originalMomentum(ai.drive,ai.brake,time));
  assert.deepEqual(b.presentation(time,['rook'],false).momentum.rook,
   originalMomentum(bi.drive,bi.brake,time));
 }
});
