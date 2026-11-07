/** UOP Stage D: the director is pure; action and visual handling agree
 * without owning gameplay simulation, firing, foot placement or transitions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {directOperatorPose} from '../src/breach-pose-director.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
import {handlingPose} from '../src/breach-weapon-pose.ts';

const base={
  seconds:6,x:0,z:0,heading:0,velocity:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  aimBlend:0,handlingIntent:'hold'
};
const context={
  moving:0,downProgress:0,pushActive:false,receivingBash:false,
  previousHandlingAt:-100
};
const sample=(pose={},ctx={})=>directOperatorPose(
  {...base,...pose},{...context,...ctx});

test('UOP director preserves existing handling and action decisions',()=>{
  const cases=[
    [{handlingIntent:'door',friendlyNear:true},'high','hold'],
    [{handlingIntent:'move',friendlyNear:true},'low','hold'],
    [{handlingIntent:'engage',aimBlend:1,aiming:true},'ads','hold'],
    [{handlingIntent:'engage',aimBlend:1,obstruction:true},'short','hold'],
    [{handlingIntent:'reload',reload:.9},'low','reload'],
    [{handlingIntent:'run'},'low','hold'],
    [{handlingOverride:'ads',treatmentActive:true},'low','treatment'],
    [{handlingOverride:'ads'},'ads','hold'],
    [{lastThrowAt:6},'ready','throw'],
    [{lastDoorAt:6,doorPoint:{x:12,y:9}},'ready','door'],
    [{down:true,reload:1},'ready','down'],
    [{surrender:true,down:true,reload:1},'ready','surrender']
  ];
  for(const [pose,expectedHandling,expectedOwner] of cases){
    const result=sample(pose);
    assert.equal(result.handling,expectedHandling,
      JSON.stringify(pose)+'/handling');
    assert.equal(result.action.handOwners.action,expectedOwner,
      JSON.stringify(pose)+'/owner');
    const direct=resolveOperatorActionState(
      {...base,...pose},0,false);
    assert.deepEqual(result.action,direct,'no duplicated action decisions');
  }
});

test('UOP director preserves passive hysteresis but replay is history-free',()=>{
  const pose={seconds:6,handlingIntent:'door',friendlyNear:true};
  const history={
    previousHandling:'low',previousHandlingAt:5.95
  };
  assert.equal(sample(pose,history).handling,'low',
    'ordinary passive threshold must not instantly flicker');
  assert.equal(sample({...pose,deterministic:true},history).handling,'high',
    'replay ignores previous live handling');
  assert.equal(sample(pose,{...history,previousHandlingAt:5.3}).handling,'high',
    'elapsed passive dwell permits transition');
  assert.equal(sample({...pose,obstruction:true},history).handling,'short',
    'hard muzzle clearance always overrides passive dwell');
});

test('UOP director is reproducible and matches shot-time handling selection',()=>{
  const pose={...base,aimBlend:.42,handlingIntent:'engage',
    threatRange:60,weapon:'carbine'};
  const ctx={...context,moving:.35};
  const first=directOperatorPose(pose,ctx);
  const second=directOperatorPose({...pose},{...ctx});
  assert.deepEqual(first,second);
  assert.equal(first.handling,handlingPose({
    aim:pose.aimBlend,moving:ctx.moving,
    obstruction:false,friendlyNear:false,intent:pose.handlingIntent,
    threatRange:pose.threatRange,weapon:pose.weapon,heldFor:106
  }));
  assert.equal(first.action.handOwners.left,'weapon');
  assert.equal(first.action.handOwners.right,'weapon');
});
