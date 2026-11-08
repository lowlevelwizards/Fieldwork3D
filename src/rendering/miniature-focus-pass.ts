/** MF-2: framebuffer-preserving miniature optics.
 * Render the original scene to the real canvas first. Copy those final
 * DISPLAY pixels and only overwrite eligible peripheral pixels. This keeps
 * sRGB, tone-mapped and toneMapped:false fog/glass materials identical to
 * the legacy renderer, with no global exposure changes or full-screen cuts.
 */
import * as THREE from 'three';
import {miniatureRegionFullyProtected,type FocusRect,type FocusPoint}
 from './miniature-focus-mask.ts';
import type {FocusDecision} from './miniature-focus-config.ts';
export type MiniatureFocusDebug='mask'|'protected'|null;
export const MINIATURE_FOCUS_MAX_ANCHORS=12;
const VERTEX=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;
const FRAGMENT=`
uniform sampler2D tDiffuse;
uniform vec2 uInvResolution;
uniform vec2 uCssViewport;
uniform vec4 uProtected;
uniform vec4 uAnchors[12];
uniform int uAnchorCount;
uniform float uRadius;
uniform float uStrength;
uniform float uDebug;
varying vec2 vUv;
float band(float a,float b,float x){
 float t=clamp((x-a)/(b-a),0.0,1.0);
 return t*t*(3.0-2.0*t);
}
float edgeMask(vec2 uv){
 vec2 edge=abs(uv*2.0-1.0);
 float peripheral=max(band(.58,.97,edge.x),band(.58,.97,edge.y));
 vec2 outside=max(max(uProtected.xy-uv,uv-uProtected.zw),vec2(0.0));
 float outsidePx=length(outside*uCssViewport);
 return peripheral*band(0.0,12.0,outsidePx);
}
float actorProtection(vec2 uv){
 float allow=1.0;
 for(int i=0;i<12;i++){
  if(i>=uAnchorCount)break;
  vec4 a=uAnchors[i];
  vec2 delta=(uv-a.xy)/max(a.zw,vec2(.000001));
  allow=min(allow,band(1.0,1.5,length(delta)));
 }
 return allow;
}
float edgePreserve(vec4 center,vec4 sampleColor){
 vec3 delta=abs(center.rgb-sampleColor.rgb);
 float contrast=max(delta.r,max(delta.g,delta.b));
 return 1.0-band(.09,.22,contrast);
}
void main(){
 float coverage=edgeMask(vUv)*actorProtection(vUv);
 if(uDebug>.5){
  gl_FragColor=vec4(uDebug>1.5?
   (coverage<.0001?vec3(.13,.52,.28):vec3(.81,.25,.10)):
    mix(vec3(.08,.37,.19),vec3(.88,.57,.12),coverage),1.0);
  return;
 }
 float blend=clamp(coverage*uStrength,0.0,1.0);
 // Discard, rather than copying the source. Protected pixels remain
 // EXACTLY those drawn by the original renderer, including their gamma,
 // tone-mapping exceptions, transparent fog and antialiasing.
 if(blend<.0001)discard;
 vec4 sharp=texture2D(tDiffuse,vUv);
 vec2 r=uInvResolution*uRadius;
 vec4 a=texture2D(tDiffuse,vUv+vec2(r.x,0.0));
 vec4 b=texture2D(tDiffuse,vUv-vec2(r.x,0.0));
 vec4 c=texture2D(tDiffuse,vUv+vec2(0.0,r.y));
 vec4 d=texture2D(tDiffuse,vUv-vec2(0.0,r.y));
 // Contrast-limited blur prevents bright silhouettes and fog edges from
 // bleeding into adjacent dark pixels. No undisclosed geometry is sampled.
 float wa=edgePreserve(sharp,a),wb=edgePreserve(sharp,b);
 float wc=edgePreserve(sharp,c),wd=edgePreserve(sharp,d);
 vec4 blurred=(sharp*.40+.15*(wa*a+wb*b+wc*c+wd*d))/
  max(.40+.15*(wa+wb+wc+wd),.40);
 // Copied framebuffer colors are already display-encoded. Do NOT
 // run tonemapping_fragment or colorspace_fragment a second time.
 gl_FragColor=mix(sharp,blurred,blend);
}
`;
export class MiniatureFocusPass{
 private capture:THREE.FramebufferTexture|null=null;
 private material:THREE.ShaderMaterial|null=null;
 private quadScene:THREE.Scene|null=null;
 private quadCamera:THREE.OrthographicCamera|null=null;
 private readonly size=new THREE.Vector2();
 private width=0;private height=0;
 private unusableReason:string|null=null;
 private allocationCount=0;
 private renderCount=0;
 constructor(private readonly renderer:THREE.WebGLRenderer){}
 private prepare():boolean{
  if(this.unusableReason)return false;
  try{
   this.renderer.getDrawingBufferSize(this.size);
   const w=Math.max(1,Math.floor(this.size.x));
   const h=Math.max(1,Math.floor(this.size.y));
   if(w>this.renderer.capabilities.maxTextureSize||
      h>this.renderer.capabilities.maxTextureSize){
    this.unusableReason='drawing-buffer-too-large';return false;
   }
   if(!this.capture||w!==this.width||h!==this.height){
    this.capture?.dispose();
    this.capture=new THREE.FramebufferTexture(w,h);
    // This is a byte-for-byte screen capture, NOT a linear scene target.
    this.capture.colorSpace=THREE.NoColorSpace;
    this.capture.minFilter=THREE.LinearFilter;
    this.capture.magFilter=THREE.LinearFilter;
    this.width=w;this.height=h;
    this.allocationCount++;
   }
   if(!this.material){
    this.material=new THREE.ShaderMaterial({
      uniforms:{
        tDiffuse:{value:this.capture},
        uInvResolution:{value:new THREE.Vector2(1/w,1/h)},
        uCssViewport:{value:new THREE.Vector2(1,1)},
        uProtected:{value:new THREE.Vector4()},
        uAnchors:{value:Array.from({length:MINIATURE_FOCUS_MAX_ANCHORS},
          ()=>new THREE.Vector4(-10,-10,1,1))},
        uAnchorCount:{value:0},
        uRadius:{value:3.2},uStrength:{value:.42},uDebug:{value:0}
      },
      vertexShader:VERTEX,fragmentShader:FRAGMENT,
      depthTest:false,depthWrite:false,transparent:false,
      toneMapped:false
    });
    this.quadScene=new THREE.Scene();
    this.quadScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2,2),this.material));
    this.quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
   }
   this.material.uniforms.tDiffuse.value=this.capture;
   this.material.uniforms.uInvResolution.value.set(1/w,1/h);
   return true;
  }catch(error){
   this.unusableReason='copy-init-failed';
   this.disposeTargets();
   console.warn('Miniature Focus disabled:',error);
   return false;
  }
 }
 /** Always draws the original scene once. The focus shader only modifies
  * peripheral pixels; failed capability or excessive visible actors
  * preserves the native frame exactly. */
 render(scene:THREE.Scene,camera:THREE.Camera,
   decision:FocusDecision,rect:FocusRect|null,
   cssWidth:number,cssHeight:number,
   anchors:readonly FocusPoint[]=[],
   debug:MiniatureFocusDebug=null):boolean{
   // Always draw the authentic scene, even when focus is enabled.
   this.renderer.render(scene,camera);
   const debugActive=debug!==null;
   if((!decision.active&&!debugActive)||!rect||cssWidth<=0||cssHeight<=0||
      anchors.length>MINIATURE_FOCUS_MAX_ANCHORS||
      (miniatureRegionFullyProtected(rect,cssWidth,cssHeight)&&!debugActive)||
      !this.prepare())return false;
   const uniforms=this.material!.uniforms;
   uniforms.uProtected.value.set(
     rect.left/cssWidth,1-rect.bottom/cssHeight,
     rect.right/cssWidth,1-rect.top/cssHeight);
   uniforms.uCssViewport.value.set(cssWidth,cssHeight);
   uniforms.uRadius.value=decision.radiusPx;
   uniforms.uStrength.value=decision.strength;
   uniforms.uDebug.value=debug==='mask'?1:debug==='protected'?2:0;
   uniforms.uAnchorCount.value=anchors.length;
   const vectors=uniforms.uAnchors.value as THREE.Vector4[];
   for(let i=0;i<anchors.length;i++){
     const a=anchors[i];
     vectors[i].set(a.x/cssWidth,1-a.y/cssHeight,
       64/cssWidth,74/cssHeight);
   }
   const previousClear=this.renderer.autoClear;
   try{
     this.renderer.copyFramebufferToTexture(this.capture!);
     // Do not clear the framebuffer: the shader intentionally discards
     // protected pixels, leaving their exact original colors intact.
     this.renderer.autoClear=false;
     this.renderer.render(this.quadScene!,this.quadCamera!);
     this.renderCount++;
     return true;
   }catch(error){
     this.unusableReason='framebuffer-copy-failed';
     console.warn('Miniature Focus falling back to direct rendering:',error);
     this.disposeTargets();
     this.renderer.autoClear=previousClear;
     this.renderer.setRenderTarget(null);
     this.renderer.render(scene,camera);
     return false;
   }finally{
     this.renderer.autoClear=previousClear;
   }
 }
 getDiagnostics(){
  return {reason:this.unusableReason??'ready',width:this.width,
   height:this.height,allocations:this.allocationCount,frames:this.renderCount,
   path:'original-framebuffer-copy',samples:0,
   format:this.capture?.type??null};
 }
 resetTemporalState():void{/* No temporal state. */}
 private disposeTargets():void{
  if(this.quadScene)this.quadScene.traverse(obj=>{
    if(obj instanceof THREE.Mesh)obj.geometry.dispose();
  });
  this.material?.dispose();this.material=null;
  this.capture?.dispose();this.capture=null;
  this.quadScene=null;this.quadCamera=null;
  this.width=0;this.height=0;
 }
 dispose():void{this.disposeTargets();}
}
