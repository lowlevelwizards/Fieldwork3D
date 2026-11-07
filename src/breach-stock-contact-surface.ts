/** Read-only, build-time measurement of the VISIBLE modular buttplate.
 * The rear authoring datum in WeaponAssembly is not necessarily the actual
 * silhouette endpoint (notably on some AK stocks). Do not use this measurement
 * as live ballistic or IK authority until stock/shoulder fitting is promoted.
 * This is called once as weapon art is built, never inside poseOperator.
 */
import * as THREE from 'three';
import {resolveWeaponAssembly,type WeaponConfiguration}
 from './equipment-weapon-assemblies.ts';

export type VisibleStockContact=Readonly<{
  stockId:string;
  /** Weapon-local unscaled rear X, not a chest-local point. */
  rearX:number;
  center:readonly [number,number,number];
  /** Bounding footprint at the physically rearmost stock surface. */
  minY:number;maxY:number;minZ:number;maxZ:number;
  /** Approximate rearward-facing buttplate normal in weapon-local space. */
  normal:readonly [-1,0,0];
  source:'marked-buttplate'|'rear-stock-geometry';
  /** Existing gameplay stock datum, for discrepancy diagnostics only. */
  authorityRearX:number;
  visualMinusAuthority:number;
  vertexSamples:number;
}>;

const isExplicitButtplate=(mesh:THREE.Mesh)=>Boolean(
  mesh.userData.stockButtplate||
  mesh.userData.hkButtpad||
  mesh.userData.hkRetractButt||
  mesh.userData.hkMP5PDWButt||
  mesh.userData.hkMP5FixedButtpad||
  mesh.userData.hkMP5RetractButt
);

/** Scans only prebuilt STOCK meshes in the root's own local frame.
 * Marked buttplates take precedence over stock rails, receiver endcaps,
 * hinges and ornamental geometry. Untagged families use the rearmost
 * stock silhouette, explicitly labelled as a lower-confidence fallback.
 */
export function measureVisibleStockContact(root:THREE.Object3D,
 configuration:WeaponConfiguration):VisibleStockContact|null{
  const build=configuration.build;
  if(!build)return null;
  // The bare MP5K receiver cap cannot be shouldered like a PDW buttplate.
  if(build.parts.receiver==='hk-mp5k-stockless'&&
     build.parts.stock!=='hk-mp5k-pdw-stock')return null;

  const stockId=build.parts.stock;
  const meshes:THREE.Mesh[]=[];
  root.traverse(o=>{
    if(o instanceof THREE.Mesh&&o.name.startsWith(
      'family-stock-'+stockId+'-'))meshes.push(o);
  });
  if(meshes.length===0)return null;
  const marked=meshes.filter(isExplicitButtplate);
  const targets=marked.length?marked:meshes;
  root.updateMatrixWorld(true);
  const rootInverse=root.matrixWorld.clone().invert();
  const transform=new THREE.Matrix4(),p=new THREE.Vector3();
  const samples:[number,number,number][]=[];
  let rearX=Infinity;
  for(const mesh of targets){
    const position=mesh.geometry.getAttribute('position');
    if(!position)continue;
    transform.multiplyMatrices(rootInverse,mesh.matrixWorld);
    for(let i=0;i<position.count;i++){
      p.set(position.getX(i),position.getY(i),position.getZ(i))
        .applyMatrix4(transform);
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||
         !Number.isFinite(p.z))continue;
      rearX=Math.min(rearX,p.x);
      samples.push([p.x,p.y,p.z]);
    }
  }
  if(!Number.isFinite(rearX)||samples.length===0)return null;
  // A narrow rear slice intentionally excludes a long stock's body and
  // nearby receiver. Do not use the entire mesh bounding box as a pad.
  const tolerance=.24;
  let minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  let count=0;
  for(const [x,y,z] of samples){
    if(x>rearX+tolerance)continue;
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    count++;
  }
  if(count<3||maxY-minY<.05||maxZ-minZ<.05)return null;
  const authorityRearX=resolveWeaponAssembly(configuration).stockX;
  return Object.freeze({
    stockId,rearX,center:[rearX,(minY+maxY)/2,(minZ+maxZ)/2] as const,
    minY,maxY,minZ,maxZ,normal:[-1,0,0] as const,
    source:marked.length?'marked-buttplate' as const:
      'rear-stock-geometry' as const,
    authorityRearX,visualMinusAuthority:rearX-authorityRearX,
    vertexSamples:count
  });
}
