import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {briefing3DDecision} from '../src/rendering/breach-briefing-idle-policy.ts';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const x=()=>({
 enabled:true,briefingVisible:true,frameMode:'idle',
 phase:'planning',replaying:false,photoActive:false,
 studioOccludes:false,viewMode:'iso',sceneReady:true,
 previouslyHeld:false
});
test('E6.13 only holds prepared covered planning 3D, never initial scene',()=>{
 assert.deepEqual(briefing3DDecision(x()),{hold:true,forceReveal:false});
 assert.deepEqual(briefing3DDecision({...x(),sceneReady:false}),
  {hold:false,forceReveal:false});
 assert.equal(briefing3DDecision({...x(),viewMode:'top'}).hold,true);
 assert.equal(briefing3DDecision({...x(),viewMode:'plan2d'}).hold,false);
});
test('E6.13 immediately restores on briefing close, disabled policy or mode change',()=>{
 assert.deepEqual(briefing3DDecision({...x(),briefingVisible:false,
  previouslyHeld:true}),{hold:false,forceReveal:true});
 assert.equal(briefing3DDecision({...x(),enabled:false,
  previouslyHeld:true}).forceReveal,true);
 assert.equal(briefing3DDecision({...x(),frameMode:'live',
  phase:'running',previouslyHeld:true}).forceReveal,true);
 for(const input of [{phase:'running'}, {replaying:true},
  {photoActive:true},{studioOccludes:true},{frameMode:'replay'},
  {frameMode:'suspended'}]){
  const decision=briefing3DDecision({...x(),...input});
  assert.equal(decision.hold,false,JSON.stringify(input));
 }
});
test('E6.13 keeps canonical opt-out, existing tactical RAF and cold evidence',()=>{
 assert.equal(parseBreachBootConfig('').briefingIdle3DEnabled,true);
 assert.equal(parseBreachBootConfig('?briefingIdle=0').briefingIdle3DEnabled,false);
 const loop=source('src/breach-runtime-loop.ts'),
  main=source('src/breach-main.ts'),
  policy=source('src/rendering/breach-briefing-idle-policy.ts');
 assert.match(loop,/isBriefingVisible:\(\)=>boolean/);
 assert.match(main,/isBriefingVisible:\(\)=>!ui\.briefingPanel\.hidden/);
 assert.match(loop,/enabled:config\.boot\.briefingIdle3DEnabled/);
 assert.match(loop,/briefingVisible:config\.isBriefingVisible\(\)/);
 assert.match(loop,/last3dSession===state&&last3dMode==='idle'/);
 assert.match(loop,/const updated3d=stageAvailable&&!briefing3d\.hold&&/);
 assert.match(loop,/briefing3d\.forceReveal\|\|/);
 assert.match(loop,/briefing3dWasHeld=false/);
 assert.match(loop,/if\(!studioOccludesTactical\)config\.renderFrame\(dt\)/);
 assert.match(loop,/mode:frameMode,viewMode,submitted3D:updated3d/);
 assert.doesNotMatch(policy,/stepSession\(|requestAnimationFrame\(|\.render\(|\.update\(/);
});
