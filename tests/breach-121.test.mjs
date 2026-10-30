import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession,team} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame,mixAngle} from '../src/breach-replay.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';

function fixture(){
  const s=newSession(0,212),rec=new MissionRecorder();
  const a=team(s)[0],initial=a.p.x;
  for(let i=0;i<=180;i++){
    const t=i/60;s.seconds=t;a.p={x:initial+t*31,y:a.p.y};
    a.velocity=t<2?31:0;
    a.heading=t<1?Math.PI-.1:-Math.PI+.1;
    a.weaponYaw=a.heading;
    a.aim=.6;a.recoil=.25;a.reload=0;
    rec.capture(s,i===180);
  }
  return {rec,s,a};
}
test('121: surrounding sample interpolates position and shortest-arc headings',()=>{
  const {rec}=fixture();
  const span=rec.surrounding(.175);
  assert.ok(span&&span.previous.t<=.175&&span.next.t>=.175);
  assert.ok(span.alpha>0&&span.alpha<1);
  const a=rec.sample(.175).actors[0],b=rec.at(.175).actors[0];
  assert.ok(a.p.x>b.p.x,'render should not step at 20 Hz');
  assert.ok(Math.abs(a.p.x-(rec.frames[0].actors[0].p.x+.175*31))<.01);
  assert.ok(Math.abs(mixAngle(Math.PI-.1,-Math.PI+.1,.5)-Math.PI)<1e-6);
});
test('121: replay sample is unchanged across seeks and playback rates',()=>{
  const {rec}=fixture();const t=.743;
  const exact=rec.sample(t);
  for(const sequence of [[0,.2,t],[2,1.7,.4,t],[3,2,1,t],
    [t,t,t],Array.from({length:150},(_,i)=>i/150).concat(t)]){
    for(const value of sequence)rec.sample(value);
    assert.deepEqual(rec.sample(t),exact);
  }
});
test('121: one timestamp returns identical feet at 30, 60 and 120 Hz',()=>{
  const {rec}=fixture(),time=1.83;
  const expected=rec.sample(time).presentation.feet.rook;
  for(const fps of [30,60,120]){
    for(let t=0;t<time;t+=1/fps)rec.sample(t);
    assert.deepEqual(rec.sample(time).presentation.feet.rook,expected);
  }
  assert.ok(rec.motion.stepEventCount>2);
  assert.ok(rec.motion.stepEventCount<rec.frames.length*2,
    'record compact step events, not every limb every frame');
});
test('121: replay outcome state remains discrete, not prematurely blended',()=>{
  const {rec}=fixture(),s=newSession(0,212);
  const t=.175;const discrete=rec.at(t),sample=rec.sample(t);
  assert.equal(sample.actors[0].health,discrete.actors[0].health);
  assert.equal(sample.actors[0].weapon,discrete.actors[0].weapon);
  assert.equal(sample.t,t);
  applyReplayFrame(s,sample);
  assert.equal(s.seconds,t);
  assert.equal(team(s)[0].p.x,sample.actors[0].p.x);
});
test('121: reconstructed full pose is identical after arbitrary seek history',()=>{
  const {rec}=fixture();
  const rig=createOperatorRig('rook','blue');
  function pose(time){
    const f=rec.sample(time),a=f.actors.find(x=>x.id==='rook');
    const down=a.health<=0;
    rig.root.position.set(a.p.x,0,a.p.y);
    poseOperator(rig,{x:a.p.x,z:a.p.y,heading:a.heading,
      velocity:a.velocity,seconds:time,stride:a.stride,
      travelYaw:f.presentation.travelYaw.rook,
      replayFeet:f.presentation.feet.rook,deterministic:true,
      posture:a.posture,injury:a.injuryStage,weapon:a.weapon,
      reload:a.reload,reloadDuration:1.8,lastThrowAt:a.lastThrowAt,
      lastDoorAt:-100,down,surrender:a.surrendered,
      aiming:a.aim>.2,firing:false,turning:a.turning,
      shotHeading:a.weaponYaw,aimBlend:a.aim,
      recoil:a.recoil*6},1/60);
    const values=[rig.root.rotation.y,rig.chest.rotation.y,
      ...rig.feet.flatMap(x=>[...x.upper.position.toArray(),
        ...x.lower.quaternion.toArray(),...x.shoe.position.toArray()]),
      ...rig.arms.flatMap(x=>[...x.upper.quaternion.toArray(),
        ...x.hand.position.toArray()])];
    for(const n of values)assert.ok(Number.isFinite(n));
    return values;
  }
  const expected=pose(1.25);
  for(const time of [.3,2.8,1.8,0,3,1.25]){
    pose(time);
  }
  const actual=pose(1.25);
  for(let i=0;i<expected.length;i++)
    assert.ok(Math.abs(actual[i]-expected[i])<1e-5,
      'frame-history-dependent pose at channel '+i);
  rig.dispose();
});
test('121: door leaves have deterministic progress from recorded events',()=>{
  const {rec}=fixture();
  const before=rec.sample(.5).presentation.doors;
  assert.ok(Object.values(before).every(x=>x>=0&&x<=1));
  assert.deepEqual(rec.sample(.5).presentation.doors,before);
});
