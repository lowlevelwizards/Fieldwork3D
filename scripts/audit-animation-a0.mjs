/** A0 scenario matrix: deterministic, read-only 30-slot snapshots.
 * Usage: node --experimental-strip-types scripts/audit-animation-a0.mjs
 *   [--out artifacts/animation-a0/report.json]
 * No browser/GPU FPS claim. Output is a reproducible acceptance artifact. */
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {ANIMATION_QA_SCENARIOS,captureAnimationQuality,
 compareAnimationFrames} from '../src/breach-animation-quality.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),
 'ar-m4a1');
const core={x:0,z:0,heading:0,travelYaw:0,pelvisYaw:0,
 velocity:0,seconds:12,stride:0,posture:'stand',injury:0,
 weapon:'carbine',weaponConfiguration:config,reload:0,
 reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 aimBlend:0,poseV3Preview:true,poseV4ReloadPreview:true,
 poseDiagnostics:false,deterministic:true};
const overrides={
 idle:{},walk:{velocity:48,gait:'walk',travelYaw:0},
 run:{velocity:75,gait:'run',handlingIntent:'run'},
 strafe:{velocity:32,travelYaw:Math.PI/2},
 reverse:{velocity:30,travelYaw:Math.PI},
 pivot:{heading:Math.PI/2,turning:1.6},
 crouch:{posture:'crouch'},ads:{aiming:true,aimBlend:1},
 'short-stock':{obstruction:true,shortCompression:.9},
 reload:{reload:.9,reloadMode:'emergency',
  magazineCarryLocations:['chest-left']},
 throw:{lastThrowAt:11.73},
 'door-reach':{lastDoorAt:11.8,doorPoint:{x:12,y:3},
  doorMethod:'open'},
 kick:{lastDoorAt:11.75,doorPoint:{x:13,y:0},doorMethod:'kick'},
 injured:{injury:2,hitAge:.18,hitRegion:'torso'},
 down:{down:true,downProgress:.75},
 surrender:{surrender:true,downProgress:.75}
};
const output={schema:1,source:'main-compatible A0 scenario matrix',
 timestamp:'deterministic 12.0s',units:'local Three.js pose units',
 constraints:{minimumSlots:30,maxFrozenDrift:1e-4},
 scenarios:[],summary:{failures:[],count:0},
 note:'CPU and contact metrics are diagnostic only; not a mobile GPU benchmark'};
for(const [i,name] of ANIMATION_QA_SCENARIOS.entries()){
 const rig=createOperatorRig('animation-a0-'+name,'blue',true);
 try{
  const pose={...core,...overrides[name]};
  const started=performance.now();
  poseOperator(rig,pose,0);
  const first=captureAnimationQuality(rig,pose.seconds);
  poseOperator(rig,pose,0);
  const second=captureAnimationQuality(rig,pose.seconds);
  const continuity=compareAnimationFrames(first,second);
  const elapsedMs=Math.round((performance.now()-started)*1000)/1000;
  const invalid=first.slotCount!==30||first.invalidSlots>0||
    second.invalidSlots>0||continuity.frozenDrift;
  if(invalid)output.summary.failures.push(name);
  output.scenarios.push({name,elapsedMs,slotCount:first.slotCount,
   gripError:first.gripError,stockError:first.stockError,
   eyeError:first.eyeError,ankleGap:first.ankleGap,
   unreachableArms:first.unreachableArms,
   unreachableLegs:first.unreachableLegs,continuity,
   // Stable output is intentionally inspected without serializing full
   // 30x11 frames into every CI log.
   firstSlotIds:Object.keys(first.slots)});
 }finally{rig.dispose();}
}
output.summary.count=output.scenarios.length;
const argument=process.argv.indexOf('--out');
if(argument>=0){
 const file=process.argv[argument+1];
 if(!file)throw Error('A0: --out needs a filename');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(output,null,2)+'\n');
}
console.log(JSON.stringify(output,null,2));
if(output.summary.failures.length)process.exitCode=1;
