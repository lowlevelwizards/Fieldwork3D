import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {footAnchorReachable} from '../src/breach-navigation.ts';
import {createLiveGait,advanceLiveGait} from '../src/breach-live-gait.ts';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angular=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const footMark=(t,point,yaw)=>({
 at:t,from:{...point},to:{...point},fromYaw:yaw,toYaw:yaw,
 unload:0,swing:0,lift:0,landing:0,recovery:0
});

/** Frozen pre-E4.B recording loop: independent allocation/reference oracle.
 * Only used by this test, never by the runtime or production replay code.
 */
class BaselineMotionRecorder{
 actors=new Map();
 doors=new Map();
 record(time,actors,doors){
  for(const actor of actors){
   const position={x:actor.p.x,y:actor.p.y};
   let track=this.actors.get(actor.id);
   if(!track){
    track={gait:createLiveGait(),events:[[],[]],
     last:{...position,t:time},travelYaw:actor.heading,
     lastStepAt:-100,pelvisYawEvents:[],travelYawEvents:[],
     lastVelocity:actor.velocity,accelEvents:[],driveEvents:[],brakeEvents:[]};
    this.actors.set(actor.id,track);
   }
   const distance=Math.hypot(position.x-track.last.x,
    position.y-track.last.y);
   if(distance>1e-4&&time>track.last.t)
    track.travelYaw=Math.atan2(position.y-track.last.y,
     position.x-track.last.x);
   const travelEvents=track.travelYawEvents;
   const lastTravel=travelEvents.at(-1);
   if(!lastTravel||Math.abs(angular(lastTravel.yaw,track.travelYaw))>.002)
    travelEvents.push({at:time,yaw:track.travelYaw});
   const moving=actor.velocity/72;
   const offset=track.travelYaw-actor.heading;
   const side=Math.abs(Math.sin(offset))>.52;
   const reverse=Math.cos(offset)<-.4;
   const rootYaw=-(moving>.22&&!side&&!reverse?
    track.travelYaw:actor.heading);
   const actuallyMoving=track.last.t<time?
    distance/Math.max(1e-3,time-track.last.t):0;
   const input={time,position,rootYaw,facingYaw:actor.heading,
    travelYaw:track.travelYaw,speed:Math.min(actor.velocity,actuallyMoving),
    turning:actor.turning,posture:actor.posture,
    injury:actor.injuryStage,down:actor.health<=0,
    cautious:actor.aim>.20&&moving<.35,
    gait:actor.squeeze?'squeeze':
     actor.plan[0]?.kind==='pie'?'pie':
     actor.pace==='run'||actor.plan[0]?.moveMode==='sprint'?
      'run':'walk',
    blocked:actor.blockedTime>.14&&
      (actor.nav.length>0||actor.plan.some(n=>
        n.kind==='move'||n.kind==='door'||n.kind==='pie')),
    footAllowed:pt=>footAnchorReachable(actor.p,pt,doors)};
   const velocityDt=time-track.last.t;
   const acceleration=velocityDt>1e-5?clamp(
    (actor.velocity-track.lastVelocity)/velocityDt,-230,230):0;
   const acc=track.accelEvents;
   if(!acc.length||Math.abs(acc[acc.length-1].acceleration-
     acceleration)>2){
    acc.push({at:time,acceleration});
    const strength=clamp(acceleration/230,-1,1);
    if(strength>.14)track.driveEvents.push({at:time,strength});
    else if(strength<-.14)
     track.brakeEvents.push({at:time,strength:-strength});
   }
   track.lastVelocity=actor.velocity;
   const previousResets=track.gait.resets;
   const previousStep=track.gait.lastStepAt;
   advanceLiveGait(track.gait,input);
   const yawEvents=track.pelvisYawEvents;
   const lastYaw=yawEvents.at(-1);
   if(!lastYaw||Math.abs(angular(lastYaw.yaw,
     track.gait.pelvisYaw))>.002)
    yawEvents.push({at:time,yaw:track.gait.pelvisYaw});
   if(track.gait.resets!==previousResets)
    for(let i=0;i<2;i++){
     const foot=track.gait.feet[i];
     track.events[i].push(footMark(time,foot.plantedAt,foot.worldYaw));
    }
   if(track.gait.lastStepAt!==previousStep&&
     track.gait.lastStepAt===time){
    const i=track.gait.lastStepFoot,foot=track.gait.feet[i];
    track.events[i].push({at:time,from:{...foot.swingFrom},
     to:{...foot.swingTo},fromYaw:foot.fromYaw,
     toYaw:foot.targetYaw,unload:foot.phaseDuration,
     swing:foot.swingDuration,landing:foot.landingDuration,
     recovery:foot.recoveryDuration,lift:input.cautious?2.1:3.4});
   }
   track.last={...position,t:time};
  }
  for(const door of doors){
   let events=this.doors.get(door.id);
   if(!events){events=[];this.doors.set(door.id,events);}
   const fraction=door.openFraction??(door.open?1:0);
   if(!events.length||Math.abs(events[events.length-1].fraction-fraction)>1e-5)
    events.push({at:time,fraction});
  }
 }
 toArchive(){
  return {schemaVersion:1,
   actors:[...this.actors].map(([id,track])=>({
    id,feet:structuredClone(track.events),
    travelYaw:track.travelYaw,
    travelYawEvents:structuredClone(track.travelYawEvents),
    pelvisYawEvents:structuredClone(track.pelvisYawEvents),
    accelEvents:structuredClone(track.accelEvents)
   })),
   doors:[...this.doors].map(([id,events])=>({
    id,events:structuredClone(events)
   }))};
 }
}

test('E4.B 60Hz seeded gait recording is archive-identical to original loop',()=>{
 const s=newSession(0,212);
 const originals=s.operators.slice(0,2);
 assert.equal(originals.length,2);
 const starting=originals.map(a=>({...a.p}));
 const baseline=new BaselineMotionRecorder();
 const optimized=new ReplayMotionRecorder();
 const doored=s.doors.slice(0,3).map(d=>({...d,a:{...d.a},b:{...d.b}}));
 const checkpoints=[0,30,90,150];
 for(let tick=0;tick<=150;tick++){
  const time=tick/60;
  // Replace actor objects and their point objects each tick, as a session
  // restoration or debrief transition can do. No closure may retain them.
  const actors=originals.map((a,i)=>({
   ...a,p:{x:starting[i].x+time*(i===0?28:11),
    y:starting[i].y+Math.sin(time*2+i)*9},
   heading:Math.sin(time*1.3+i)*.8,velocity:tick%45<4?0:31,
   turning:tick%18<5?.6:0,
   aim:tick%45<12?.26:.1,
   squeeze:tick%60>=40&&tick%60<52,
   posture:tick%50<10?'crouch':'stand',
   pace:tick%65<9?'run':'walk',
   blockedTime:tick%80<3?.2:0
  }));
  if(doored.length){
   doored[0].openFraction=tick%40<12?.15:tick%40<27?.7:1;
   doored[0].open=doored[0].openFraction>.3;
  }
  const unchanged=actors.map(a=>({...a.p}));
  baseline.record(time,actors,doored);
  optimized.record(time,actors,doored);
  assert.deepEqual(actors.map(a=>a.p),unchanged,
   'foot clearance cannot move authoritative operators');
  if(checkpoints.includes(tick))
   assert.deepEqual(optimized.toArchive(),baseline.toArchive(),
    'archive diverged at fixed step '+tick);
 }
 const expected=baseline.toArchive(),actual=optimized.toArchive();
 assert.deepEqual(actual,expected);
 assert.ok(actual.actors.every(a=>a.feet[0].length&&a.feet[1].length));
 for(const time of [0,.25,1,1.5,2.5]){
  const prior=new ReplayMotionRecorder();
  prior.loadArchive(expected);
  const after=new ReplayMotionRecorder();
  after.loadArchive(actual);
  const ids=originals.map(a=>a.id);
  assert.deepEqual(after.presentation(time,ids),
   prior.presentation(time,ids),'seek '+time+' differs');
  assert.deepEqual(after.touchdownsBetween(0,time,ids),
   prior.touchdownsBetween(0,time,ids),'contact interval differs');
 }
});

test('E4.B recorder never aliases live actor pose or door event sources',()=>{
 const s=newSession(0,212),actor=s.operators[0];
 const rec=new ReplayMotionRecorder();
 const p={...actor.p};
 rec.record(0,[actor],s.doors);
 rec.record(1/60,[{...actor,p:{x:p.x+1,y:p.y+2}}],s.doors);
 const before=rec.toArchive();
 actor.p.x+=300;actor.p.y-=100;
 if(s.doors.length)s.doors[0].openFraction=.93;
 assert.deepEqual(rec.toArchive(),before,
  'retained samples must not alias mutable live positions or hinge states');
});
