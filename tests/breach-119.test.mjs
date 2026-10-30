import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFootsteps,createFootstepScheduler,gaitBounds} from
  '../src/breach-footsteps.ts';

const input=(time,x=0,y=0,rootYaw=0,speed=0,extra={})=>({
  time,position:{x,y},rootYaw,travelYaw:0,speed,turning:0,
  posture:'stand',injury:0,down:false,...extra
});
test('119: comfort, landing lead and anatomical reach are distinct thresholds',()=>{
  const bounds=gaitBounds(input(0,0,0,0,50));
  assert.ok(bounds.preferredLead>0);
  assert.ok(bounds.maximumReach>bounds.comfortableForward);
  assert.ok(bounds.emergencyReach>bounds.maximumReach);
  assert.ok(gaitBounds({...input(0),cautious:true}).preferredLead<
    bounds.preferredLead);
});
test('119: world foot anchors are immutable outside landing or reset',()=>{
  const state=createFootstepScheduler();
  let before=null,transitions=0;
  for(let frame=0;frame<240;frame++){
    const t=frame/60,pose=input(t,t*43,0,0,43);
    advanceFootsteps(state,pose);
    const current=state.feet.map(f=>({phase:f.phase,
      point:{...f.plantedAt},contact:f.contact}));
    if(before)for(let i=0;i<2;i++){
      if(current[i].phase!=='landing'&&before[i].phase!=='swinging'&&
        current[i].phase!=='unloading'){
        assert.deepEqual(current[i].point,before[i].point,
          'a planted anchor cannot drift or teleport');
      }
      if(before[i].phase==='swinging'&&current[i].phase==='landing')
        transitions++;
    }
    assert.ok(current.some(f=>f.contact),'at least one foot supports the body');
    before=current;
  }
  assert.ok(transitions>=6,'walking must produce repeated deliberate touchdowns');
  assert.ok(state.resets===1,'ordinary walking cannot reset planted feet');
});
test('119: normal walking never swings both feet at once',()=>{
  const state=createFootstepScheduler();
  for(let frame=0;frame<300;frame++){
    const t=frame/60;
    advanceFootsteps(state,input(t,t*55,0,0,55));
    assert.ok(state.feet.filter(f=>f.phase==='swinging').length<=1);
  }
});
test('119: the last step completes and both feet settle after stopping',()=>{
  const state=createFootstepScheduler();
  for(let frame=0;frame<220;frame++){
    const t=frame/60,x=Math.min(t,1.5)*35;
    advanceFootsteps(state,input(t,x,0,0,t<1.5?35:0));
  }
  assert.ok(state.feet.every(f=>f.phase==='planted'));
  const anchors=state.feet.map(f=>({...f.plantedAt}));
  for(let j=220;j<300;j++)
    advanceFootsteps(state,input(j/60,1.5*35,0,0,0));
  assert.deepEqual(state.feet.map(f=>f.plantedAt),anchors);
});
test('119: turning requires explicit repositioning, not moving planted anchors',()=>{
  const state=createFootstepScheduler();
  const start=input(0);
  advanceFootsteps(state,start);
  let swings=0,previous=state.feet.map(f=>f.phase);
  for(let i=1;i<160;i++){
    const t=i/60;
    const yaw=Math.min(1,t/1.4)*Math.PI;
    advanceFootsteps(state,input(t,0,0,yaw,0,{travelYaw:yaw,turning:1}));
    for(let j=0;j<2;j++)if(state.feet[j].phase==='swinging'&&
      previous[j]!=='swinging')swings++;
    previous=state.feet.map(f=>f.phase);
  }
  assert.ok(swings>=1,'turning on the spot needs purposeful pivot steps');
});
test('119: timestamp discontinuities reset contacts, routine ticks do not',()=>{
  const state=createFootstepScheduler();
  advanceFootsteps(state,input(0,0,0,0,0));
  for(let i=1;i<100;i++)advanceFootsteps(state,input(i/60,i*.6,0,0,36));
  assert.equal(state.resets,1);
  advanceFootsteps(state,input(10,900,900,1,0));
  assert.equal(state.resets,2);
  assert.ok(state.feet.every(f=>f.contact));
  assert.deepEqual(state.feet[0].plantedAt,{
    x:900-Math.sin(1)*-5.6,y:900+Math.cos(1)*-5.6});
});
