import test from 'node:test';
import assert from 'node:assert/strict';
import {captureTargetTransportEligible,designatedDownedCaptureTarget}
 from '../src/breach-capture-transport-policy.ts';
const mission={missionType:'capture',captureTarget:'guard'};
const target={id:'guard',side:'red',health:0,surrendered:false,carriedById:null};
const carrier={id:'rook',side:'blue',health:4,carryingId:null};
test('D15.5E only the designated physical downed target may be transported',()=>{
 assert.equal(captureTargetTransportEligible(mission,target,carrier),true);
 assert.equal(designatedDownedCaptureTarget(mission,target),true);
 for(const [m,s,c] of [
  [{...mission,captureTarget:'other'},target,carrier],
  [{...mission,missionType:'rescue'},target,carrier],
  [mission,{...target,side:'blue'},carrier],
  [mission,{...target,health:3,surrendered:true},carrier],
  [mission,{...target,id:'sentry'},carrier],
  [mission,target,{...carrier,side:'red'}],
  [mission,target,{...carrier,health:0}],
  [mission,{...target,carriedById:'moss'},carrier],
  [mission,target,{...carrier,carryingId:'civilian'}]
 ])assert.equal(captureTargetTransportEligible(m,s,c),false);
});
test('D15.5E existing exclusive carrier link is idempotent, not another body',()=>{
 assert.equal(captureTargetTransportEligible(mission,
  {...target,carriedById:carrier.id},
  {...carrier,carryingId:target.id}),true);
 assert.equal(captureTargetTransportEligible(mission,
  {...target,carriedById:carrier.id},
  {...carrier,id:'moss'}),false);
});
