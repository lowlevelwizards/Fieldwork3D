/** Hash actual exterior artwork, excluding runtime UUIDs and wall time.
 * Same script runs against pinned WA2 and candidate checkouts. */
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {refs,equipped,customEntries,construct} from '../src/arsenal/wa-art-models.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const jsonHash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function texture(t){const a=t.image?.data;return {name:t.name,width:t.image?.width,height:t.image?.height,data:ArrayBuffer.isView(a)?hash(a):null,colorSpace:t.colorSpace,minFilter:t.minFilter,magFilter:t.magFilter,wrapS:t.wrapS,wrapT:t.wrapT,flipY:t.flipY,generateMipmaps:t.generateMipmaps};}
function material(m){return {type:m.type,role:visualMaterialRole(m),color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,transparent:m.transparent,side:m.side,flatShading:m.flatShading,depthWrite:m.depthWrite,depthTest:m.depthTest,maps:Object.fromEntries(Object.entries(m).filter(([,v])=>v instanceof THREE.Texture).map(([k,v])=>[k,texture(v)]))};}
const records=[];
for(const e of [...refs,...equipped,...customEntries]){
 const m=construct(e),nodes=[];
 try{m.model.updateMatrixWorld(true);m.model.traverse(n=>{
 if(!(n instanceof THREE.Mesh))return;
 const g=n.geometry;
 nodes.push({name:n.name,world:n.matrixWorld.elements,visible:n.visible,casts:n.castShadow,receives:n.receiveShadow,renderOrder:n.renderOrder,
  attributes:Object.fromEntries(Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,{size:v.itemSize,count:v.count,data:hash(v.array)}])),
  index:g.index?hash(g.index.array):null,groups:g.groups,instances:n instanceof THREE.InstancedMesh?{count:n.count,matrix:hash(n.instanceMatrix.array)}:null,
  materials:(Array.isArray(n.material)?n.material:[n.material]).map(material)});
 });records.push({id:e.id,meshes:nodes.length,artHash:jsonHash(nodes)});}finally{m.cleanup();}
}
const report={schema:'wa3-art-parity-v1',records};
writeFileSync(process.argv[2]??'wa3-parity.json',JSON.stringify(report,null,2)+'\n');
console.log('WA3 parity snapshot: '+records.length+' production artwork cases');
