/** W7.3: project static wear into a real visible opaque fixture face.
 * No overlay geometry; fallback is existing material aging, never a floating decal. */
import * as THREE from 'three';
import type {ObjectWear} from '../worldgen/object-wear.ts';
import {canWear} from '../worldgen/material-properties.ts';
import {PIXEL_SURFACES,type PixelSurface} from './pixel-recipes.ts';
import {visualMaterialRole,surfaceVisualRole} from './material-identity.ts';
import {wearFinish} from './wear-finish.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './wear-opacity.ts';
import {wearPixels,wearVariant} from './pixel-decals.ts';
import type {WearKind} from '../worldgen/environment-wear.ts';
type Strength={value:number};
type Cache=Map<string,THREE.MeshStandardMaterial>;
function realSurface(material:THREE.MeshStandardMaterial,fallback:PixelSurface):PixelSurface|undefined{
 const kind=material.map?.name.match(/^Fieldwork pixel \d+:([^:]+):\d+$/)?.[1] as PixelSurface|undefined;
 if(kind&&PIXEL_SURFACES.includes(kind))return kind==='paper'?undefined:kind;
 const role=visualMaterialRole(material);
 return role!=='neutral'&&role===surfaceVisualRole(fallback)?fallback:undefined;
}
export function fixtureWearGeometry(source:THREE.BufferGeometry,point:THREE.Vector3,normal:THREE.Vector3,size:number,variant=0,flipU=false){
 const geometry=source.clone(),pos=geometry.getAttribute('position'),norm=geometry.getAttribute('normal');
 const uv=new Float32Array(pos.count*3),variants=new Float32Array(pos.count).fill(variant);
 const n=normal.clone().normalize();
 const tangent=Math.abs(n.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0).cross(n).normalize();
 const bitangent=n.clone().cross(tangent).normalize();
 const delta=new THREE.Vector3(),vertexNormal=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){
  delta.fromBufferAttribute(pos,i).sub(point);
  vertexNormal.fromBufferAttribute(norm,i);
  uv[i*3]=.5+(flipU?-1:1)*delta.dot(tangent)/size;
  uv[i*3+1]=.5+delta.dot(bitangent)/(size*.7);
  uv[i*3+2]=Math.abs(delta.dot(n))<.05&&vertexNormal.dot(n)>.98?1:0;
 }
 geometry.setAttribute('fwFixtureWearUV',new THREE.BufferAttribute(uv,3));
 geometry.setAttribute('fwFixtureWearVariant',new THREE.BufferAttribute(variants,1));
 return geometry;
}
function materialFor(base:THREE.MeshStandardMaterial,surface:PixelSurface,mark:ObjectWear,texture:THREE.DataTexture,boost:Strength,cache:Cache,track:(m:THREE.Material)=>void){
 const bucket=wearOpacityBucket(mark.opacity),key=[base.uuid,surface,mark.kind,bucket,texture.uuid].join(':');
 let m=cache.get(key);if(m)return m;
 m=base.clone();delete m.userData.fieldworkR718WorldGraphic;
 const finish=wearFinish(surface,mark.kind,base.color.getHex()),color=new THREE.Color(finish.color),rim=new THREE.Color(finish.rimColor),opacity=WEAR_ALPHA_BANDS[bucket];
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{fwFixtureWear:{value:texture},fwFixtureTint:{value:color},fwFixtureRim:{value:rim},fwFixtureOpacity:{value:opacity},fwFixtureBoost:boost,fwFixtureAtlas:{value:texture.image.width===64?1:0}});
  shader.vertexShader='attribute vec3 fwFixtureWearUV;\nattribute float fwFixtureWearVariant;\nvarying float vFWFixtureWearVariant;\nvarying vec3 vFWFixtureWearUV;\n'+
   shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFWFixtureWearUV=fwFixtureWearUV;\nvFWFixtureWearVariant=fwFixtureWearVariant;');
  shader.fragmentShader='uniform sampler2D fwFixtureWear;\nuniform vec3 fwFixtureTint;\nuniform vec3 fwFixtureRim;\nuniform float fwFixtureOpacity;\nuniform float fwFixtureBoost;\nuniform float fwFixtureAtlas;\nvarying float vFWFixtureWearVariant;\nvarying vec3 vFWFixtureWearUV;\n'+
   shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec2 fwUV=vFWFixtureWearUV.xy;\nfloat fwInside=step(0.0,fwUV.x)*step(fwUV.x,1.0)*step(0.0,fwUV.y)*step(fwUV.y,1.0);\nvec2 fwCell=vec2(mod(vFWFixtureWearVariant,2.0),floor(vFWFixtureWearVariant/2.0));\nvec2 fwSample=mix(clamp(fwUV,0.0,1.0),(fwCell*32.0+0.5+clamp(fwUV,0.0,1.0)*31.0)/64.0,fwFixtureAtlas);\nfloat fwCoverage=texture2D(fwFixtureWear,fwSample).a;\nfloat fwWearA=fwCoverage*fwInside*step(.999,vFWFixtureWearUV.z)*min(1.0,fwFixtureOpacity*fwFixtureBoost);\ndiffuseColor.rgb=mix(diffuseColor.rgb,mix(fwFixtureRim,fwFixtureTint,step(.72,fwCoverage)),fwWearA);');
 };
 m.customProgramCacheKey=()=> 'ma-r-fixture-wear-v2';
 m.needsUpdate=true;track(m);cache.set(key,m);return m;
}
export function projectFixtureWear(root:THREE.Group,mark:ObjectWear,x:number,y:number,z:number,surface:PixelSurface,
 options:{textures:Map<WearKind,THREE.DataTexture>;cache:Cache;boost:Strength;track:(m:THREE.Material)=>void;shared:ReadonlySet<THREE.BufferGeometry>;template:boolean;fixture?:string;variantAtlas?:boolean;trackTexture?:(t:THREE.DataTexture)=>void;retireGeometry?:(g:THREE.BufferGeometry)=>void}):boolean{
 root.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster(),dir=new THREE.Vector3(0,0,-1).transformDirection(root.matrixWorld),down=new THREE.Vector3(0,-1,0).transformDirection(root.matrixWorld);
 const topFixtures=['desk','dining-table','coffee-table','meeting-table','workbench','counter','kitchen-island','sink','utility-sink','sofa','armchair','chair','office-chair','pallet'];
 const top=topFixtures.includes(options.fixture??'')&&['scratch','chip','scrape','scuff','stain','mineral','grease','abrade'].includes(mark.kind);
 const trials:{point:THREE.Vector3;dir:THREE.Vector3}[]=[];
 if(top)for(const offset of [0,-mark.size*.2,mark.size*.2])trials.push({point:new THREE.Vector3(x+offset,y+64,z*.28),dir:down});
 // Front trials remain bounded; each ray accepts only its nearest opaque compatible face.
 for(const [dx,dy] of [[0,0],[-mark.size*.24,0],[mark.size*.24,0],[0,mark.size*.2],[0,-mark.size*.2]])trials.push({point:new THREE.Vector3(x+dx,y+dy,z+24),dir});
 for(const trial of trials){
  ray.set(root.localToWorld(trial.point),trial.dir);
  const hit=ray.intersectObject(root,true).find(h=>h.object instanceof THREE.Mesh&&h.object.visible);
  if(!hit||!hit.face||!(hit.object instanceof THREE.Mesh))continue;
  const mesh=hit.object,base=mesh.material,geo=mesh.geometry;
  if(!(base instanceof THREE.MeshStandardMaterial)||base.transparent||base.alphaTest>0||!base.depthWrite||
    mesh instanceof THREE.InstancedMesh||mesh.customDepthMaterial||mesh.customDistanceMaterial||
    geo.getAttribute('fwFixtureWearUV')||!geo.getAttribute('normal')||!geo.getAttribute('position'))continue;
  const actual=realSurface(base,surface);if(!actual||!canWear(actual,mark.kind))continue;
  const point=mesh.worldToLocal(hit.point.clone()),normal=hit.face.normal;
  const variant=options.variantAtlas?wearVariant(mark.id):0;
  const geometry=fixtureWearGeometry(geo,point,normal,mark.size,variant,mark.kind==='fray'&&mark.u>.5);
  // A shared template or box cache remains immutable. A unique retired
  // source buffer is released only if no sibling still references it.
  mesh.geometry=geometry;
  let referenced=false;root.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry===geo)referenced=true;});
  // A source geometry can also be referenced by a different fixture or
  // a repeated instance. Do not infer global ownership from this subtree.
  // The caller owns the site-level retirement set, checked after all patches.
  if(!options.template&&!options.shared.has(geo)&&!referenced)options.retireGeometry?.(geo);
  let texture=options.textures.get(mark.kind);
  if(!texture){
   const atlas=options.variantAtlas,size=atlas?64:32;
   let bytes=wearPixels(mark.kind);
   if(atlas){bytes=new Uint8Array(64*64*4);for(let v=0;v<4;v++){const mask=wearPixels(mark.kind,v);for(let row=0;row<32;row++)bytes.set(mask.subarray(row*128,(row+1)*128),((Math.floor(v/2)*32+row)*64+(v%2)*32)*4);}}
   texture=new THREE.DataTexture(bytes,size,size);
   texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
   texture.minFilter=THREE.NearestMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
   options.textures.set(mark.kind,texture);options.trackTexture?.(texture);}
  mesh.material=materialFor(base,actual,mark,texture,options.boost,options.cache,options.track);
  mesh.userData.fieldworkDrawFamily='fixture-wear-integrated';
  return true;
 }
 return false;
}
