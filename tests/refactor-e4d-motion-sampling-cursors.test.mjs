import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {ReplayMotionRecorder,sampleFootEvents}
 from '../src/breach-replay-motion.ts';
import {indexMovementImpulses,sampleMovementImpulses}
 from '../src/breach-motion-transitions.ts';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angular=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
/** Original right-biased binary seek, independent of E4.D cursor logic. */
function oldSeek(events,time){
 let lo=0,hi=events.length-1;
 while(lo<hi){
  const mid=Math.ceil((lo+hi)/2);
  if(events[mid].at<=time)lo=mid;else hi=mid-1;
 }
 return lo;
}
/** Frozen pre-E4.D presenter contract, including sparse yaw interpolation,
 * live motion impulses and the optional door timeline. */
function oldPresentation(data,time,ids,includeDoors=true){
 const actors=new Map(data.actors.map(a=>[a.id,a]));
 const feet={},travelYaw={},pelvisYaw={},acceleration={},momentum={};
 for(const id of ids){
  const track=actors.get(id);
  if(!track||!track.feet[0].length)continue;
  feet[id]=[sampleFootEvents(track.feet[0],time),
   sampleFootEvents(track.feet[1],time)];
  const travel=track.travelYawEvents;
  travelYaw[id]=travel[oldSeek(travel,time)]?.yaw??track.travelYaw;
  const acc=track.accelEvents;
  acceleration[id]=acc[oldSeek(acc,time)]?.acceleration??0;
  const impulse=indexMovementImpulses(acc);
  momentum[id]=sampleMovementImpulses(impulse.drive,impulse.brake,time);
  const samples=track.pelvisYawEvents;
  const i=oldSeek(samples,time);
  const a=samples[i],b=samples[Math.min(i+1,samples.length-1)];
  const blend=b.at>a.at?clamp((time-a.at)/(b.at-a.at),0,1):0;
  pelvisYaw[id]=a.yaw+angular(a.yaw,b.yaw)*blend;
 }
 const doors={};
 if(includeDoors)for(const d of data.doors){
  const events=d.events,i=oldSeek(events,time);
  const a=events[i],b=events[Math.min(i+1,events.length-1)];
  if(!a)continue;
  const alpha=b.at>a.at?clamp((time-a.at)/(b.at-a.at),0,1):0;
  doors[d.id]=a.fraction+(b.fraction-a.fraction)*alpha;
 }
 return {feet,travelYaw,pelvisYaw,acceleration,momentum,doors};
}
const event=(at,i)=>({
 at,from:{x:i*2,y:1},to:{x:i*2+1,y:2},
 fromYaw:.12,toYaw:.3,unload:.02,swing:i%13===0?0:.11,
 lift:3.4,landing:.035,recovery:.055
});
const series=(n,step,convert,unordered=false)=>{
 const events=[];
 for(let i=0;i<n;i++){
  // Consecutive ties must select the final matching entry.
  let at=i*step;
  if(i>0&&i%17===0)at=(i-1)*step;
  if(unordered&&i===Math.floor(n/2))at=-.5;
  events.push(convert(at,i));
 }
 return events;
};
function makeArchive(unordered=false){
 const actor=(id,offset)=>({
  id,travelYaw:1.4,
  feet:[
   series(610,.085,(at,i)=>event(at+offset,i),unordered),
   series(610,.087,(at,i)=>event(at+offset,i+1),unordered)
  ],
  travelYawEvents:series(720,.073,(at,i)=>({at:at+offset,yaw:Math.sin(i*.07)}),unordered),
  pelvisYawEvents:series(710,.074,(at,i)=>({at:at+offset,yaw:Math.cos(i*.04)}),unordered),
  accelEvents:series(680,.079,(at,i)=>({at:at+offset,acceleration:(i%13-6)*19}),unordered)
 });
 return {schemaVersion:1,actors:[actor('rook',0),actor('moss',.15)],
  doors:[{id:'gate-1',events:series(760,.071,(at,i)=>({
   at,fraction:(i%15)/15
  }),unordered)},{id:'gate-2',events:series(680,.079,(at,i)=>({
   at:at+.4,fraction:(i%11)/11
  }),unordered)}]};
}
function assertParity(data){
 const recorder=new ReplayMotionRecorder();
 recorder.loadArchive(data);
 const frozen=recorder.toArchive();
 assert.deepEqual(frozen,data,'V1 motion archive must remain byte-equivalent');
 const times=[-10,0,.01,.07,.1,1.001,17.2,34.4,68,Infinity,-Infinity,
  NaN,36.5,35.7,35.7,0,10,40,2,2.8,2.8];
 for(let i=0;i<160;i++)times.push(i%3===0?
  44+i/130:i%3===1?8+(i%60)*.31:60-i*.34);
 for(const time of times){
  for(const ids of [['rook','moss'],['moss'],['moss','rook'],
   ['missing'],['rook','missing','rook']]){
   for(const includeDoors of [true,false]){
    const actual=recorder.presentation(time,ids,includeDoors);
    assert.deepEqual(actual,oldPresentation(data,time,ids,includeDoors),
     'presentation diverged at '+time+' '+ids+' doors='+includeDoors);
   }
  }
 }
 assert.deepEqual(recorder.toArchive(),frozen,
  'repeated seeks must not mutate serialized evidence');
 recorder.loadArchive(data);
 for(const time of [55,3.2,3.21,3.19,0,60])
  assert.deepEqual(recorder.presentation(time,['rook','moss']),
   oldPresentation(data,time,['rook','moss']));
}
test('E4.D ordered histories preserve exact 2D/ISO replay presentation through seeks',()=>{
 assertParity(makeArchive());
});
test('E4.D nonchronological V1 histories preserve original binary fallback',()=>{
 assertParity(makeArchive(true));
});
test('E4.D sparse timelines with nonfinite archived event dates use old seek results',()=>{
 const data=makeArchive(true);
 data.actors[0].travelYawEvents[200].at=Number.NaN;
 data.actors[1].pelvisYawEvents[240].at=Infinity;
 data.actors[0].accelEvents[150].at=Number.NaN;
 data.doors[0].events[220].at=Number.NaN;
 assertParity(data);
});
test('E4.D seek cursors stay fresh after live append and a different archive',()=>{
 const session=newSession(0,212);
 const actor=session.operators[0],rec=new ReplayMotionRecorder();
 const start={...actor.p};
 for(let tick=0;tick<=210;tick++){
  const time=tick/60;
  actor.p={x:start.x+time*24,y:start.y+Math.sin(time*1.6)*5};
  actor.velocity=tick%30<4?0:24;
  actor.heading=Math.sin(time)*.5;
  rec.record(time,[actor],session.doors);
  if(tick%7===0){
   const original=rec.toArchive();
   for(const seek of [time,time-.001,0,time+10,time-1/60])
    assert.deepEqual(rec.presentation(seek,[actor.id],false),
     oldPresentation(original,seek,[actor.id],false),
     'live append '+tick+' seek '+seek);
  }
 }
 const old=rec.toArchive();
 const replacement=makeArchive();
 rec.loadArchive(replacement);
 assert.deepEqual(rec.presentation(28.1,['rook','moss']),
  oldPresentation(replacement,28.1,['rook','moss']),
  'replacement archive must not reuse old actor or door cursors');
 assert.deepEqual(rec.toArchive(),replacement);
 const restored=new ReplayMotionRecorder();
 restored.loadArchive(old);
 assert.deepEqual(restored.presentation(2.3,[actor.id],false),
  oldPresentation(old,2.3,[actor.id],false));
});
test('E4.D adjacent frames inspect bounded timestamps rather than binary-search history',()=>{
 const data=makeArchive();
 const rec=new ReplayMotionRecorder();
 rec.loadArchive(data);
 // Private track arrays are instrumented only inside the regression test.
 // Their event values are still those of a real loaded V1 archive.
 const track=rec.actors.get('rook');
 assert.ok(track,'expected restored actor');
 let reads=0;
 for(const entry of track.travelYawEvents){
  const at=entry.at;
  Object.defineProperty(entry,'at',{configurable:true,
   get(){reads++;return at;}});
 }
 rec.presentation(24,['rook'],false); // one-time monotonicity scan/warm-up
 reads=0;
 for(let i=1;i<=120;i++)
  rec.presentation(24+i/60,['rook'],false);
 assert.ok(reads<120*8,
  'adjacent playback should inspect O(1) event times per frame, got '+reads);
 // A large rewind must still match the historical binary fallback.
 assert.deepEqual(rec.presentation(1.1,['rook'],false),
  oldPresentation(data,1.1,['rook'],false));
});

test('E4.D independent replay recorders cannot share cursor or pose history',()=>{
 const first=makeArchive(),second=makeArchive();
 // Same actor/door IDs, different historical evidence in each instance.
 second.actors[0].travelYawEvents[300].yaw+=1.1;
 second.actors[0].pelvisYawEvents[350].yaw-=.7;
 second.doors[0].events[320].fraction=.99;
 const a=new ReplayMotionRecorder(),b=new ReplayMotionRecorder();
 a.loadArchive(first);b.loadArchive(second);
 for(const time of [0,22.1,22.12,22.14,23.8,1,39.9,22.11]){
  assert.deepEqual(a.presentation(time,['rook','moss']),
   oldPresentation(first,time,['rook','moss']));
  assert.deepEqual(b.presentation(time,['rook','moss']),
   oldPresentation(second,time,['rook','moss']));
 }
 assert.deepEqual(a.toArchive(),first);
 assert.deepEqual(b.toArchive(),second);
});
