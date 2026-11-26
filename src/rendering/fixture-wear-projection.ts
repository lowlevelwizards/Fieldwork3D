/** W7.3: project static wear into a real visible opaque fixture face.
 * No overlay geometry; fallback is existing material aging, never a floating decal. */
import * as THREE from 'three';
import type {ObjectWear} from '../worldgen/object-wear.ts';
import {canWear} from '../worldgen/material-properties.ts';
import {PIXEL_SURFACES,type PixelSurface} from './pixel-recipes.ts';
import {visualMaterialRole,surfaceVisualRole} from './material-identity.ts';
import {wearFinish} from './wear-finish.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './wear-opacity.ts';
import {wearPixels} from './pixel-decals.ts';
import type {WearKind} from '../worldgen/environment-wear.ts';
type Strength={value:number};
type Cache=Map<string,THREE.MeshStandardMaterial>;
function realSurface(material:THREE.MeshStandardMaterial,fallback:PixelSurface):PixelSurface|undefined{
 const kind=material.map?.name.match(/^Fieldwork pixel \d+:([^:]+):\d+$/)?.[1] as PixelSurface|undefined;
 if(kind&&PIXEL_SURFACES.includes(kind))return kind==='paper'?undefined:kind;
 const role=visualMaterialRole(material);
 return role!=='neutral'&&role===surfaceVisualRole(fallback)?fallback:undefined;
}
export function fixtureWearGeometry(source:THREE.BufferGeometry,point:THREE.Vector3,normal:THREE.Vector3,size:number){
 const geometry=source.clone(),pos=geometry.getAttribute('position'),norm=geometry.getAttribute('normal');
 const uv=new Float32Array(pos.count*3);
 const n=normal.clone().normalize();
 const tangent=Math.abs(n.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0).cross(n).normalize();
 const bitangent=n.clone().cross(tangent).normalize();
 const delta=new THREE.Vector3(),vertexNormal=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){
  delta.fromBufferAttribute(pos,i).sub(point);
  vertexNormal.fromBufferAttribute(norm,i);
  uv[i*3]=.5+delta.dot(tangent)/size;
  uv[i*3+1]=.5+delta.dot(bitangent)/(size*.7);
  uv[i*3+2]=Math.abs(delta.dot(n))<.05&&vertexNormal.dot(n)>.98?1:0;
 }
 geometry.setAttribute('fwFixtureWearUV',new THREE.BufferAttribute(uv,3));
 return geometry;
}
function materialFor(base:THREE.MeshStandardMaterial,surface:PixelSurface,mark:ObjectWear,texture:THREE.DataTexture,boost:Strength,cache:Cache,track:(m:THREE.Material)=>void){
 const bucket=wearOpacityBucket(mark.opacity),key=[base.uuid,surface,mark.kind,bucket].join(':');
 let m=cache.get(key);if(m)return m;
 m=base.clone();delete m.userData.fieldworkR718WorldGraphic;
 const finish=wearFinish(surface,mark.kind,base.color.getHex()),color=new THREE.Color(finish.color),opacity=WEAR_ALPHA_BANDS[bucket];
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{fwFixtureWear:{value:texture},fwFixtureTint:{value:color},fwFixtureOpacity:{value:opacity},fwFixtureBoost:boost});
  shader.vertexShader='attribute vec3 fwFixtureWearUV;\nvarying vec3 vFWFixtureWearUV;\n'+
   shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFWFixtureWearUV=fwFixtureWearUV;');
  shader.fragmentShader='uniform sampler2D fwFixtureWear;\nuniform vec3 fwFixtureTint;\nuniform float fwFixtureOpacity;\nuniform float fwFixtureBoost;\nvarying vec3 vFWFixtureWearUV;\n'+
   shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec2 fwUV=vFWFixtureWearUV.xy;\nfloat fwInside=step(0.0,fwUV.x)*step(fwUV.x,1.0)*step(0.0,fwUV.y)*step(fwUV.y,1.0);\nfloat fwWearA=texture2D(fwFixtureWear,clamp(fwUV,0.0,1.0)).a*fwInside*step(.999,vFWFixtureWearUV.z)*min(1.0,fwFixtureOpacity*fwFixtureBoost);\ndiffuseColor.rgb=mix(diffuseColor.rgb,fwFixtureTint,fwWearA);');
 };
 m.customProgramCacheKey=()=> 'w7-fixture-wear-v1';
 m.needsUpdate=true;track(m);cache.set(key,m);return m;
}
export function projectFixtureWear(root:THREE.Group,mark:ObjectWear,x:number,y:number,z:number,surface:PixelSurface,
 options:{textures:Map<WearKind,THREE.DataTexture>;cache:Cache;boost:Strength;track:(m:THREE.Material)=>void;shared:ReadonlySet<THREE.BufferGeometry>;template:boolean;retireGeometry?:(g:THREE.BufferGeometry)=>void}):boolean{
 root.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster(),dir=new THREE.Vector3(0,0,-1).transformDirection(root.matrixWorld);
 // Bounded front-facing trials, never project through a visible incompatible face.
 for(const [dx,dy] of [[0,0],[-mark.size*.24,0],[mark.size*.24,0],[0,mark.size*.2],[0,-mark.size*.2]]){
  ray.set(root.localToWorld(new THREE.Vector3(x+dx,y+dy,z+24)),dir);
  const hit=ray.intersectObject(root,true).find(h=>h.object instanceof THREE.Mesh&&h.object.visible);
  if(!hit||!hit.face||!(hit.object instanceof THREE.Mesh))continue;
  const mesh=hit.object,base=mesh.material,geo=mesh.geometry;
  if(!(base instanceof THREE.MeshStandardMaterial)||base.transparent||base.alphaTest>0||!base.depthWrite||
    mesh instanceof THREE.InstancedMesh||mesh.customDepthMaterial||mesh.customDistanceMaterial||
    geo.getAttribute('fwFixtureWearUV')||!geo.getAttribute('normal')||!geo.getAttribute('position'))continue;
  const actual=realSurface(base,surface);if(!actual||!canWear(actual,mark.kind))continue;
  const point=mesh.worldToLocal(hit.point.clone()),normal=hit.face.normal;
  const geometry=fixtureWearGeometry(geo,point,normal,mark.size);
  // A shared template or box cache remains immutable. A unique retired
  // source buffer is released only if no sibling still references it.
  mesh.geometry=geometry;
  let referenced=false;root.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry===geo)referenced=true;});
  // A source geometry can also be referenced by a different fixture or
  // a repeated instance. Do not infer global ownership from this subtree.
  // The caller owns the site-level retirement set, checked after all patches.
  if(!options.template&&!options.shared.has(geo)&&!referenced)options.retireGeometry?.(geo);
  let texture=options.textures.get(mark.kind);
  if(!texture){texture=new THREE.DataTexture(wearPixels(mark.kind),32,32);
   texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
   texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
   options.textures.set(mark.kind,texture);}
  mesh.material=materialFor(base,actual,mark,texture,options.boost,options.cache,options.track);
  mesh.userData.fieldworkDrawFamily='fixture-wear-integrated';
  return true;
 }
 return false;
}
