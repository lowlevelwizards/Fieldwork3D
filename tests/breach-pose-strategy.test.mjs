import test from 'node:test';
import assert from 'node:assert/strict';
import {planUpperBodyStrategy} from '../src/breach-pose-director.ts';
const base={
 seconds:9,weapon:'carbine',posture:'stand',
 reload:0,reloadDuration:1.8,turning:0,
 down:false,surrender:false,firing:false,aiming:false,
 aimBlend:0,lastDoorAt:-100,lastThrowAt:-100,
 poseV3Preview:true
};
const context={
 handling:'low',physicalSpeed:0,hasModularBuild:true,
 activeTransition:false,authoredLabSwitch:false,
 interactionWindow:false
};
const plan=(pose={},contextDelta={})=>
 planUpperBodyStrategy({...base,...pose},{...context,...contextDelta});
test('UOP strategy: stable modular low-ready owns coupled fitting',()=>{
 const r=plan();
 assert.equal(r.coupledEligible,true);
 assert.equal(r.supportEligible,true);
 assert.equal(r.coordinatedEligible,true);
 assert.equal(r.envelopeRequired,true);
 for(const p of [
   {firing:true},{aiming:true},{aimBlend:.3},{posture:'crouch'},
   {turning:.5},{velocity:30},{lastDoorAt:8.7},
   {lastThrowAt:8.6},{treatmentActive:true},{down:true},
   {surrender:true},{hitAge:.3}
 ]){
   const ctx=p.velocity?{physicalSpeed:p.velocity}:{};
   const q={...p};delete q.velocity;
   assert.equal(plan(q,ctx).coupledEligible,false,JSON.stringify(p));
 }
});
test('UOP strategy: combat, actions and preview switches preserve priorities',()=>{
 const ads=plan({aiming:true,aimBlend:1},{handling:'ads'});
 assert.equal(ads.coupledEligible,false);
 assert.equal(ads.coordinatedEligible,true);
 assert.equal(ads.supportEligible,true);
 const reload=plan({reload:.9});
 assert.equal(reload.previewReloadSeed,true);
 assert.equal(reload.coupledEligible,true);
 assert.equal(reload.supportEligible,false);
 const wait=plan({},{activeTransition:true});
 assert.equal(wait.coupledEligible,false);
 assert.equal(wait.coordinatedEligible,false);
 assert.equal(wait.supportEligible,true);
 const lab=plan({},{
   activeTransition:true,authoredLabSwitch:true
 });
 assert.equal(lab.coupledEligible,true);
 assert.equal(lab.coordinatedEligible,false);
 assert.equal(plan({},{interactionWindow:true}).coordinatedEligible,false);
 const game=plan({poseV3Preview:false});
 assert.equal(game.coupledEligible,true,'live low ready keeps its proven fit');
 assert.equal(game.coordinatedEligible,false);
 assert.equal(game.supportEligible,false);
});
test('UOP strategy is a pure deterministic decision from authoritative input',()=>{
 const p={...base},ctx={...context};
 const a=planUpperBodyStrategy(p,ctx),b=planUpperBodyStrategy(p,ctx);
 assert.deepEqual(a,b);
 assert.deepEqual(p,base);
 assert.deepEqual(ctx,context);
});
