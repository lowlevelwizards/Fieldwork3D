/** MF-1B: opt-in scene-only optical softness. Does not touch simulation,
 * tactical overlays, fog authority, materials, or camera projection.
 * The disabled path is exactly the legacy renderer.render(scene,camera).
 */
import * as THREE from 'three';
import {miniatureRegionFullyProtected,type FocusRect}
  from './miniature-focus-mask.ts';
import type {FocusDecision} from './miniature-focus-config.ts';

export type MiniatureFocusDebug='mask'|'protected'|null;
const VERTEX=`
varying vec2 vUv;
void main(){
 vUv=uv;
 gl_Position=vec4(position.xy,0.0,1.0);
}`;
const FRAGMENT=`
uniform sampler2D tDiffuse;
uniform vec2 uInvResolution;
uniform vec2 uCssViewport;
uniform vec4 uProtected;
uniform float uRadius;
uniform float uStrength;
uniform float uDebug;
varying vec2 vUv;
// ShaderMaterial injects tone/color-space helper declarations itself.
float band(float a,float b,float x){
 float t=clamp((x-a)/(b-a),0.0,1.0);
 return t*t*(3.0-2.0*t);
}
float eligibility(vec2 uv){
 vec2 edge=abs(uv*2.0-1.0);
 float peripheral=max(band(.80,.98,edge.x),band(.80,.98,edge.y));
 vec2 outside=max(max(uProtected.xy-uv,uv-uProtected.zw),vec2(0.0));
 float outsidePx=length(outside*uCssViewport);
 return peripheral*band(0.0,12.0,outsidePx);
}
void main(){
 vec4 sharp=texture2D(tDiffuse,vUv);
 float mask=eligibility(vUv);
 if(uDebug>0.5){
  vec3 color=uDebug>1.5?
   (mask<0.0001?vec3(.12,.55,.30):vec3(.85,.28,.12)):
   mix(vec3(.08,.38,.19),vec3(.89,.60,.12),mask);
  gl_FragColor=vec4(color,1.0);
 }else{
  float blend=clamp(mask*uStrength,0.0,1.0);
  if(blend<0.0001){
   gl_FragColor=sharp;
  }else{
   vec2 r=uInvResolution*uRadius;
   vec4 blurred=sharp*.40+
    (texture2D(tDiffuse,vUv+vec2(r.x,0.0))+
     texture2D(tDiffuse,vUv-vec2(r.x,0.0))+
     texture2D(tDiffuse,vUv+vec2(0.0,r.y))+
     texture2D(tDiffuse,vUv-vec2(0.0,r.y)))*.15;
   gl_FragColor=mix(sharp,blurred,blend);
  }
 }
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export class MiniatureFocusPass{
 private target:THREE.WebGLRenderTarget|null=null;
 private material:THREE.ShaderMaterial|null=null;
 private quadScene:THREE.Scene|null=null;
 private quadCamera:THREE.OrthographicCamera|null=null;
 private size=new THREE.Vector2();
 private width=0;private height=0;
 private unusableReason:string|null=null;
 private allocationCount=0;
 private renderCount=0;
 constructor(private readonly renderer:THREE.WebGLRenderer){}
 private prepare():boolean{
  if(this.unusableReason)return false;
  try{
   const gl=this.renderer.getContext();
   if(!this.renderer.capabilities.isWebGL2||
       !gl.getExtension('EXT_color_buffer_float')){
    this.unusableReason='half-float-target-unavailable';return false;
   }
   if(!this.target){
    const maxSamples=Math.max(0,this.renderer.capabilities.maxSamples||0);
    this.target=new THREE.WebGLRenderTarget(1,1,{
      type:THREE.HalfFloatType,format:THREE.RGBAFormat,
      colorSpace:THREE.LinearSRGBColorSpace,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      depthBuffer:true,stencilBuffer:false,generateMipmaps:false,
      samples:Math.min(4,maxSamples),
    });
    this.allocationCount++;
   }
   if(!this.material){
    this.material=new THREE.ShaderMaterial({
     uniforms:{
      tDiffuse:{value:this.target.texture},
      uInvResolution:{value:new THREE.Vector2(1,1)},
      uCssViewport:{value:new THREE.Vector2(1,1)},
      uProtected:{value:new THREE.Vector4()},
      uRadius:{value:1},uStrength:{value:.15},uDebug:{value:0}
     },
     vertexShader:VERTEX,fragmentShader:FRAGMENT,
     depthTest:false,depthWrite:false,transparent:false,
     toneMapped:true,
    });
    this.quadScene=new THREE.Scene();
    this.quadScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2,2),this.material));
    this.quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
   }
   this.renderer.getDrawingBufferSize(this.size);
   const w=Math.max(1,Math.floor(this.size.x));
   const h=Math.max(1,Math.floor(this.size.y));
   if(w!==this.width||h!==this.height){
     this.target.setSize(w,h);
     this.width=w;this.height=h;
     this.material.uniforms.uInvResolution.value.set(1/w,1/h);
   }
   return true;
  }catch(error){
   this.unusableReason='target-init-failed';
   this.disposeTargets();
   console.warn('Miniature Focus disabled:',error);
   return false;
  }
 }
 /** Returns true if the optical pass was used; always draws exactly one
  * presentation frame (either via the pass or the original direct path).
  */
 render(scene:THREE.Scene,camera:THREE.Camera,
  decision:FocusDecision,rect:FocusRect|null,
  cssWidth:number,cssHeight:number,debug:MiniatureFocusDebug=null):boolean{
  const debugActive=debug!==null;
  if((!decision.active&&!debugActive)||!rect||cssWidth<=0||cssHeight<=0||
     (miniatureRegionFullyProtected(rect,cssWidth,cssHeight)&&!debugActive)||
     !this.prepare()){
    this.renderer.render(scene,camera);return false;
  }
  const material=this.material!,target=this.target!;
  // The input rectangle is CSS top-left; shader UVs are bottom-left.
  material.uniforms.uProtected.value.set(
    rect.left/cssWidth,1-rect.bottom/cssHeight,
    rect.right/cssWidth,1-rect.top/cssHeight);
  material.uniforms.uCssViewport.value.set(cssWidth,cssHeight);
  material.uniforms.uRadius.value=decision.radiusPx;
  material.uniforms.uStrength.value=decision.strength;
  material.uniforms.uDebug.value=debug==='mask'?1:debug==='protected'?2:0;
  try{
   this.renderer.setRenderTarget(target);
   // Restore the default framebuffer even if something throws.
   this.renderer.render(scene,camera);
   this.renderer.setRenderTarget(null);
   this.renderer.render(this.quadScene!,this.quadCamera!);
   this.renderCount++;
   return true;
  }catch(error){
   this.renderer.setRenderTarget(null);
   this.unusableReason='render-failed';
   console.warn('Miniature Focus fallback:',error);
   this.disposeTargets();
   this.renderer.render(scene,camera);
   return false;
  }
 }
 getDiagnostics(){
  return {reason:this.unusableReason??'ready',width:this.width,
    height:this.height,allocations:this.allocationCount,frames:this.renderCount,
    samples:this.target?.samples??0,format:this.target?.texture.type??null};
 }
 resetTemporalState():void{/* Deliberately stateless across director cuts and seeks. */}
 private disposeTargets():void{
  if(this.quadScene){
   this.quadScene.traverse(obj=>{
    if(obj instanceof THREE.Mesh)obj.geometry.dispose();
   });
  }
  this.material?.dispose();this.material=null;
  this.target?.dispose();this.target=null;
  this.quadScene=null;this.quadCamera=null;
  this.width=0;this.height=0;
 }
 dispose():void{this.disposeTargets();}
}
