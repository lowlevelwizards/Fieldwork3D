/** E6.7: real cold createOperatorRig workload, opt-in CPU only.
 * This script is copied unchanged to a pinned baseline tree and current tree.
 * Geometry and pose fingerprints are strict; wall time is observational.
 */
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createOperatorRig,poseOperator}
 from '../../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput}
 from '../../src/breach-operator-pose-output.ts';

const id='e6-rig';
const pose=(i)=>({
 x:i*14,z:0,heading:i*.17,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 deterministic:true,poseDiagnostics:false
});
function geometryFingerprint(root,excluded=new Set()){
 const isExcluded=node=>{for(let p=node;p;p=p.parent)if(excluded.has(p))return true;return false;};
 const h=createHash('sha256');let meshes=0,geometries=0;
 let vertices=0,segments=0;
 root.traverse(node=>{
  if(!node.isMesh||isExcluded(node))return;
  meshes++;
  const geo=node.geometry;
  if(!geo)return;
  geometries++;
  h.update('mesh:'+node.name+':'+node.visible+':'+node.castShadow+':'+node.receiveShadow+'|');
  for(const key of Object.keys(geo.attributes).sort()){
   const attr=geo.attributes[key];
   h.update('attr:'+key+':'+attr.itemSize+':'+attr.count+'|');
   for(let i=0;i<attr.count;i++){
    for(let c=0;c<attr.itemSize;c++){
     // Float32 binary representation, including exact UV seams and normals.
     const b=Buffer.allocUnsafe(4);b.writeFloatLE(attr.getComponent(i,c));
     h.update(b);
    }
   }
   if(key==='position')vertices+=attr.count;
  }
  const index=geo.index;
  if(index){h.update('index:'+index.count+'|');
   for(let i=0;i<index.count;i++)h.update(String(index.getX(i))+',');}
  const cuts=node.userData.garmentSegmentGeometries;
  if(cuts)segments++;
 });
 return {hash:h.digest('hex'),meshes,geometries,vertices,segments};
}
const roundCount=3,batch=5;
const rounds=[];let initial=null,nonFootwear=null;
for(let round=0;round<roundCount;round++){
 const rigs=[],times=[];
 try{
  for(let i=0;i<batch;i++){
   const begin=performance.now();
   const rig=createOperatorRig(id+'-'+i,'blue',true);
   times.push(performance.now()-begin);
   rigs.push(rig);
  }
  if(!initial){
   const rig=rigs[0];
   initial=geometryFingerprint(rig.root);
   // FW artwork is intentional. Keep strict parity over EVERY other rig mesh.
   const excluded=new Set(rig.feet.map(foot=>foot.shoe));
   for(const foot of rig.feet){const legacy=foot.lower.userData.garmentBootShaft;if(legacy)excluded.add(legacy);}
   for(const variants of rig.visualKit.footwear?.models??[])for(const model of Object.values(variants))excluded.add(model.shaft);
   nonFootwear=geometryFingerprint(rig.root,excluded);
   if(initial.meshes<20||initial.segments<6)
    throw Error('E6.7 rig geometry corpus incomplete');
  }
  let poseTotal=0;
  for(let i=0;i<rigs.length;i++){
   const start=performance.now();
   poseOperator(rigs[i],pose(i),0);
   poseTotal+=performance.now()-start;
   const out=inspectOperatorPoseOutput(rigs[i]);
   if(!out||!out.valid||out.slotCount!==30)
    throw Error('E6.7 pose solver failed after cold rig preparation');
  }
  rounds.push({createMs:times.map(t=>+t.toFixed(3)),
   totalCreateMs:+times.reduce((a,b)=>a+b,0).toFixed(3),
   poseMs:+poseTotal.toFixed(3)});
 }finally{for(const rig of rigs)rig.dispose();}
}
const report={schema:'fieldwork-e6.7-cold-rig-v1',
 environment:{node:process.version,platform:process.platform,
  arch:process.arch},batch,roundCount,appearance:initial,nonFootwear,rounds,
 caveat:'Real Node CPU createOperatorRig and pose work, not RAF, WebGL compile or iPhone GPU time. Do not gate on elapsed milliseconds.'};
const i=process.argv.indexOf('--out');
if(i>=0){const path=process.argv[i+1];
 if(!path)throw Error('E6.7 --out requires file');
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');
}
console.log('E6_7_COLD_RIG',JSON.stringify(report));
