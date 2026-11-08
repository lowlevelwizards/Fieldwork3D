/** R7.15 Studio-only silhouette bleed.
 * Transparent backfaces of EXISTING geometry expand beyond the visible edge
 * while the original opaque mesh depth-masks all internal surfaces.
 * No geometry cloning, fullscreen pass, persistence or tactical materials.
 * This costs one additional preview draw per visible soft mesh, so keep the
 * treatment strictly opt-in and reuse its materials during interactive edits.
 */
import * as THREE from 'three';
import type {StudioLightLabSettings} from './operator-studio-light-lab.ts';

export type StudioBleedRole='fabric'|'skin';
type BleedUniforms={
 width:{value:number};opacity:{value:number};backlight:{value:number};
 warmth:{value:number};key:{value:THREE.Vector3};
 color:{value:THREE.Color};debug:{value:number}
};
type Cached={material:THREE.ShaderMaterial;uniforms:BleedUniforms};
type BleedCache=Map<THREE.MeshStandardMaterial,Map<StudioBleedRole,Cached>>;
const CACHE='fieldworkStudioBleedCache';
const OVERLAY='fieldworkStudioEdgeBleedOverlay';

function makeBleed(role:StudioBleedRole,source:THREE.MeshStandardMaterial):Cached{
 const uniforms:BleedUniforms={
  width:{value:.4},opacity:{value:0},backlight:{value:.8},
  warmth:{value:1},key:{value:new THREE.Vector3(.46,.88,.07).normalize()},
  color:{value:source.color.clone()},debug:{value:0}
 };
 const material=new THREE.ShaderMaterial({
  name:'Fieldwork R7.15 '+role+' silhouette bleed',
  uniforms:{
   fwBleedWidth:uniforms.width,
   fwBleedOpacity:uniforms.opacity,
   fwBleedBacklight:uniforms.backlight,
   fwBleedWarmth:uniforms.warmth,
   fwBleedKeyWorld:uniforms.key,
   fwBleedColor:uniforms.color,
   fwBleedDebug:uniforms.debug
  },
  vertexShader:`
   uniform float fwBleedWidth;
   varying vec3 vBleedNormal;
   varying vec3 vBleedView;
   void main(){
    // Sculptural voxel edge: normal offset gives genuine silhouette
    // extrusion, not a glowing face-filling Fresnel patch.
    vec3 expanded=position+normalize(normal)*fwBleedWidth;
    vec4 view=modelViewMatrix*vec4(expanded,1.0);
    vBleedNormal=normalize(normalMatrix*normal);
    vBleedView=normalize(-view.xyz);
    gl_Position=projectionMatrix*view;
   }`,
  fragmentShader:`
   uniform float fwBleedOpacity;
   uniform float fwBleedBacklight;
   uniform float fwBleedWarmth;
   uniform float fwBleedDebug;
   uniform vec3 fwBleedKeyWorld;
   uniform vec3 fwBleedColor;
   varying vec3 vBleedNormal;
   varying vec3 vBleedView;
   void main(){
    vec3 n=normalize(vBleedNormal);
    vec3 v=normalize(vBleedView);
    vec3 key=normalize((viewMatrix*vec4(fwBleedKeyWorld,0.0)).xyz);
    // The back-face hull is visible only beyond the front surface.
    // Restrict its color to grazing/backlit portions of that silhouette.
    float edge=1.0-abs(dot(n,v));
    float contour=smoothstep(.06,.56,edge);
    float rear=max(0.0,dot(-n,key));
    float lightBehind=max(0.0,dot(-key,v));
    float backlit=max(rear,lightBehind);
    float backFactor=mix(.10,1.0,
     clamp(backlit*fwBleedBacklight,0.0,1.0));
    float coverage=contour*backFactor;
    float alpha=clamp(coverage*fwBleedOpacity,0.0,.5);
    if(alpha<.001)discard;
    vec3 ink=fwBleedColor;
    if(fwBleedDebug>.5){
     ink=vec3(coverage);
     alpha=max(alpha,coverage*.65);
    }
    gl_FragColor=vec4(ink,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
  side:THREE.BackSide,transparent:true,depthTest:true,depthWrite:false,
  toneMapped:true
 });
 material.userData.fieldworkStudioBleedOnly=true;
 return {material,uniforms};
}
function cacheFor(root:THREE.Object3D):BleedCache{
 let cache=root.userData[CACHE] as BleedCache|undefined;
 if(!cache){cache=new Map();root.userData[CACHE]=cache;}
 return cache;
}
/** Material remains sourced from the mesh; no save, palette or UV mutation. */
export function applyStudioEdgeBleed(root:THREE.Object3D,mesh:THREE.Mesh,
 source:THREE.MeshStandardMaterial,role:StudioBleedRole,
 config:StudioLightLabSettings):boolean{
 if(!mesh.geometry.getAttribute('normal')||
    !mesh.geometry.getAttribute('position'))return false;
 const opacity=role==='fabric'?config.rimFabricOpacity:config.rimSkinOpacity;
 if(opacity<=0)return false;
 const width=role==='fabric'?config.rimFabricWidth:config.rimSkinWidth;
 const backlight=role==='fabric'?config.rimFabricBacklight:config.rimSkinBacklight;
 const geometry=mesh.geometry;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const bounds=geometry.boundingBox;
 if(!bounds||bounds.isEmpty())return false;
 // A cap, pack and tiny strap should not all receive an identical huge
 // extrusion. Clamp at practical voxel scale to protect contacts and seams.
 const span=bounds.getSize(new THREE.Vector3());
 const smallest=Math.max(.10,Math.min(span.x,span.y,span.z));
 const extrusion=Math.min(.85,Math.max(.08,smallest*.08*width));
 const cache=cacheFor(root);
 let variants=cache.get(source);
 if(!variants){variants=new Map();cache.set(source,variants);}
 let entry=variants.get(role);
 if(!entry){entry=makeBleed(role,source);variants.set(role,entry);}
 const u=entry.uniforms;
 u.width.value=extrusion;
 u.opacity.value=opacity;
 u.backlight.value=backlight;
 u.warmth.value=config.rimSkinWarmth;
 u.key.value.set(.46,.88,.07).normalize().applyAxisAngle(
  new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(config.lightAzimuth));
 // Skin tint is derived from the CURRENT complexion, not a fixed bright
 // coral replacement. Color is linear and honors the source color.
 if(role==='skin'){
  const warm=new THREE.Color(0xea7963);
  u.color.value.copy(source.color).lerp(warm,.42*config.rimSkinWarmth);
 }else u.color.value.setHex(0xffebc9);
 u.debug.value=config.rimDebugMask?1:0;
 const overlay=new THREE.Mesh(mesh.geometry,entry.material);
 overlay.name='fieldwork-studio-edge-bleed';
 overlay.userData[OVERLAY]=true;
 overlay.castShadow=false;overlay.receiveShadow=false;
 overlay.frustumCulled=mesh.frustumCulled;
 overlay.renderOrder=mesh.renderOrder+1;
 overlay.raycast=()=>{};
 mesh.add(overlay);
 return true;
}
/** Remove transient hull meshes without disposing their shared source geometry. */
export function clearStudioEdgeBleed(root:THREE.Object3D):void{
 const shells:THREE.Mesh[]=[];
 root.traverse(node=>{
  if(node instanceof THREE.Mesh&&node.userData[OVERLAY]===true)
   shells.push(node);
 });
 for(const shell of shells)shell.removeFromParent();
}
export function disposeStudioEdgeBleed(root:THREE.Object3D):void{
 clearStudioEdgeBleed(root);
 const cache=root.userData[CACHE] as BleedCache|undefined;
 if(cache)for(const roles of cache.values())
  for(const entry of roles.values())entry.material.dispose();
 delete root.userData[CACHE];
}
