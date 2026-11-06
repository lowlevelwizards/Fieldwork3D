/** Reproducible CPU-side lighting/wardrobe workload.
 * Four live rigs, outfit changes, repeated pose ticks, and budget census.
 * This is NOT a GPU benchmark. Physical Safari still gates release.
 * Run: npm run bench:operator-lighting
 */
import {performance} from 'node:perf_hooks';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';

function measure(fn){
 const start=performance.now();fn();
 return Math.round((performance.now()-start)*100)/100;
}
const median=items=>items.slice().sort((a,b)=>a-b)[Math.floor(items.length/2)];
const styles=[
 {top:'bdu-shirt',trousers:'bdu-trousers',headwear:'patrol-cap',
  armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'rucksack'},
 {top:'acu-shirt',trousers:'acu-trousers',headwear:'pasgt',
  armorStyle:'plate-standard',rigStyle:'split-front',packStyle:'assault-pack'},
 {top:'gorka-jacket',trousers:'bdu-trousers',headwear:'boonie',
  armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'field-pack'}
];
let gear=initialEquipmentLoadout();
gear=setEquipmentChoice(gear,'armor','armor-carrier');
gear=setEquipmentChoice(gear,'rig','rig-full');
const bases=Array.from({length:4},(_,i)=>({
 x:i*20,z:0,heading:i*.1,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,appearanceSeed:i+1,equipment:gear
}));
const wardrobe=initialWardrobe();
const roots=[];
const coldMs=measure(()=>{
 for(let i=0;i<4;i++)roots.push(createOperatorRig(
  'benchmark-'+i,'blue',true));
});
const dress=(index,style,t)=>({
 ...bases[index],seconds:t,wardrobe:{...wardrobe,styles:style}
});
const firstDressMs=measure(()=>{
 for(let i=0;i<4;i++)
  poseOperator(roots[i],dress(i,styles[i%styles.length],0),0);
});
const warm=[];
for(let frame=1;frame<=60;frame++){
 warm.push(measure(()=>{
  for(let i=0;i<4;i++)poseOperator(roots[i],{
   ...dress(i,styles[i%styles.length],frame/60),
   stride:(frame%30)/30,velocity:15
  },1/60);
 }));
}
const swaps=[];
for(let pass=0;pass<3;pass++)swaps.push(measure(()=>{
 for(let i=0;i<4;i++)
  poseOperator(roots[i],dress(i,styles[(i+pass+1)%styles.length],
   2+pass),0);
}));
const unique=new Set();let meshes=0,vertices=0,maskBytes=0;
for(const rig of roots)rig.root.traverse(node=>{
 if(!(node instanceof THREE.Mesh))return;
 meshes++;
 const g=node.geometry;
 if(unique.has(g))return;
 unique.add(g);
 vertices+=g.getAttribute('position')?.count??0;
 for(const field of ['fieldworkSelfOcclusionMask',
  'fieldworkExternalOcclusionMask','fieldworkInterContactMask',
  'fieldworkDirectionalCastMask','fieldworkContactBaseTone',
  'fieldworkContactComposedTone']){
  const bytes=g.userData[field];
  if(bytes instanceof Uint8Array)maskBytes+=bytes.byteLength;
 }
});
const report={
 workload:'4 rigs / 3 outfit presets / 60 animated pose ticks',
 cpuMs:{coldConstruction:coldMs,firstDress:firstDressMs,
  medianWarmPose:median(warm),maxWarmPose:Math.max(...warm),
  outfitSwapBatches:swaps},
 geometry:{meshes,uniqueGeometries:unique.size,vertices,
  cpuMaskKiB:Math.round(maskBytes/1024)},
 nodeHeapMiB:Math.round(process.memoryUsage().heapUsed/(1024*1024)),
 caveat:'CPU/Node only; browser draw calls, GPU time, and physical iPhone heat require a separate device run'
};
for(const rig of roots)rig.dispose();
console.log(JSON.stringify(report,null,2));
