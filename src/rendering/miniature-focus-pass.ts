/** MF-3: photographic miniature / tilt-shift optics.
 * The world is rendered ONCE to the normal canvas. We copy already-final
 * display pixels before doing two inexpensive quarter-resolution blur
 * passes and a full-screen mask composite. HUD/plan canvases remain sharp.
 * Critically: no re-tonemapping of fog, glass or material exceptions.
 */
import * as THREE from 'three';
import type {FocusDecision} from './miniature-focus-config.ts';
import type {FocusPoint} from './miniature-focus-mask.ts';
export type MiniatureFocusDebug='mask'|'protected'|'band'|null;
export const MINIATURE_FOCUS_MAX_ANCHORS=3;
const VERTEX=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;
/** Seven-tap separable Gaussian approximation. First pass samples a
 * full-size screenshot but draws at 1/4 width AND height. Second pass
 * filters that low resolution texture vertically.
 */
const BLUR=`
uniform sampler2D tDiffuse;
uniform vec2 uBlurStep;
varying vec2 vUv;
void main(){
 vec4 sum=texture2D(tDiffuse,vUv)*.22;
 sum+=(texture2D(tDiffuse,vUv+uBlurStep)+
       texture2D(tDiffuse,vUv-uBlurStep))*.19;
 sum+=(texture2D(tDiffuse,vUv+uBlurStep*2.0)+
       texture2D(tDiffuse,vUv-uBlurStep*2.0))*.12;
 sum+=(texture2D(tDiffuse,vUv+uBlurStep*3.0)+
       texture2D(tDiffuse,vUv-uBlurStep*3.0))*.08;
 gl_FragColor=sum;
}
`;
/** NOTE: textures are SCREEN-ENCODED and toneMapped:false. No Three.js
 * tonemapping_fragment or colorspace_fragment on any post-pass. */
const COMPOSITE=`
uniform sampler2D tOriginal;
uniform sampler2D tBlur;
uniform sampler2D tAttention;
uniform float uHasAttention;
uniform float uZoomStrength;
uniform float uCenterY;
uniform float uInnerHalf;
uniform float uOuterHalf;
uniform float uStrength;
uniform float uSaturation;
uniform float uContrast;
uniform float uDebug;
uniform int uAnchorCount;
uniform vec4 uAnchors[3];
varying vec2 vUv;
float band(float a,float b,float x){
 float t=clamp((x-a)/(b-a),0.0,1.0);
 return t*t*(3.0-2.0*t);
}
float visibilityGuard(vec2 uv){
 float allow=1.0;
 for(int i=0;i<3;i++){
  if(i>=uAnchorCount)break;
  vec4 a=uAnchors[i];
  vec2 delta=(uv-a.xy)/max(a.zw,vec2(.0001));
  allow=min(allow,band(.78,1.18,length(delta)));
 }
 return allow;
}
void main(){
 // focusCenter uses top-down screen coordinates; vUv uses bottom-up.
 float distanceFromBand=abs((1.0-vUv.y)-uCenterY);
 float optics=band(uInnerHalf,uOuterHalf,distanceFromBand);
 float tactical=uHasAttention>.5?texture2D(tAttention,vUv).r:0.0;
 float mask=optics*(1.0-clamp(tactical,0.0,1.0))*
    visibilityGuard(vUv)*uZoomStrength;
 if(uDebug>.5){
  float centerLine=1.0-step(.002,abs((1.0-vUv.y)-uCenterY));
  float edgeLines=1.0-step(.002,
    abs(distanceFromBand-uInnerHalf));
  vec3 maskColor=mix(vec3(.10,.62,.32),vec3(.92,.56,.15),mask);
  if(uDebug>2.5)maskColor=mix(maskColor,vec3(.97,.95,.72),
    max(centerLine,edgeLines));
  if(uDebug>1.5&&uDebug<2.5)
    maskColor=mask<.0001?vec3(.10,.48,.28):vec3(.83,.25,.12);
  gl_FragColor=vec4(maskColor,1.0);
  return;
 }
 float amount=clamp(mask*uStrength,0.0,1.0);
 if(amount<.00001)discard;
 vec4 sharp=texture2D(tOriginal,vUv);
 vec4 soft=texture2D(tBlur,vUv);
 // Fog and undiscovered-room boundaries are strong color discontinuities.
 // Never bleed a brighter disclosed pixel into dark concealed space.
 vec3 delta=abs(sharp.rgb-soft.rgb);
 float disagreement=max(delta.r,max(delta.g,delta.b));
 amount*=1.0-band(.11,.29,disagreement);
 if(amount<.00001)discard;
 // Grade applies only to the blur portion; center of the frame is
 // byte-identical to the original. Neutral gray axis prevents tint shifts.
 float gray=dot(soft.rgb,vec3(.2126,.7152,.0722));
 vec3 grade=mix(vec3(gray),soft.rgb,uSaturation);
 grade=(grade-.5)*uContrast+.5;
 grade=clamp(grade,vec3(0.0),vec3(1.0));
 gl_FragColor=vec4(mix(sharp.rgb,grade,amount),sharp.a);
}
`;
export class MiniatureFocusPass{
 private original:THREE.FramebufferTexture|null=null;
 private horizontal:THREE.WebGLRenderTarget|null=null;
 private vertical:THREE.WebGLRenderTarget|null=null;
 private blurMaterial:THREE.ShaderMaterial|null=null;
 private compositeMaterial:THREE.ShaderMaterial|null=null;
 private blurScene:THREE.Scene|null=null;
 private compositeScene:THREE.Scene|null=null;
 private quadCamera:THREE.OrthographicCamera|null=null;
 private readonly size=new THREE.Vector2();
 private width=0;private height=0;
 private smallWidth=0;private smallHeight=0;
 private allocationCount=0;private renderCount=0;
 private failure:string|null=null;
 constructor(private readonly renderer:THREE.WebGLRenderer){}
 private init():boolean{
  if(this.failure)return false;
  try{
   this.renderer.getDrawingBufferSize(this.size);
   const w=Math.max(1,Math.floor(this.size.x));
   const h=Math.max(1,Math.floor(this.size.y));
   if(!this.renderer.capabilities.isWebGL2||
      w>this.renderer.capabilities.maxTextureSize||
      h>this.renderer.capabilities.maxTextureSize){
     this.failure='unsupported-canvas';return false;
   }
   if(w!==this.width||h!==this.height||!this.original){
     this.disposeBuffers();
     this.width=w;this.height=h;
     this.smallWidth=Math.max(1,Math.ceil(w/4));
     this.smallHeight=Math.max(1,Math.ceil(h/4));
     this.original=new THREE.FramebufferTexture(w,h);
     this.original.colorSpace=THREE.NoColorSpace;
     this.original.minFilter=THREE.LinearFilter;
     this.original.magFilter=THREE.LinearFilter;
     const options={
       type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
       colorSpace:THREE.NoColorSpace,minFilter:THREE.LinearFilter,
       magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,
       generateMipmaps:false
     };
     this.horizontal=new THREE.WebGLRenderTarget(
       this.smallWidth,this.smallHeight,options);
     this.vertical=new THREE.WebGLRenderTarget(
       this.smallWidth,this.smallHeight,options);
     this.allocationCount++;
   }
   if(!this.blurMaterial){
     this.blurMaterial=new THREE.ShaderMaterial({
      uniforms:{
       tDiffuse:{value:this.original},
       uBlurStep:{value:new THREE.Vector2()}
      },
      vertexShader:VERTEX,fragmentShader:BLUR,
      depthTest:false,depthWrite:false,toneMapped:false
     });
     this.compositeMaterial=new THREE.ShaderMaterial({
       uniforms:{
         tOriginal:{value:this.original},
         tBlur:{value:this.vertical!.texture},
         tAttention:{value:this.original},
         uHasAttention:{value:0},uZoomStrength:{value:1},
         uCenterY:{value:.56},uInnerHalf:{value:.15},
         uOuterHalf:{value:.34},uStrength:{value:.82},
         uSaturation:{value:1.045},uContrast:{value:1.02},
         uDebug:{value:0},uAnchorCount:{value:0},
         uAnchors:{value:Array.from(
          {length:MINIATURE_FOCUS_MAX_ANCHORS},
          ()=>new THREE.Vector4(-10,-10,1,1))}
       },
       vertexShader:VERTEX,fragmentShader:COMPOSITE,
       depthTest:false,depthWrite:false,toneMapped:false
     });
     const plane=new THREE.PlaneGeometry(2,2);
     this.blurScene=new THREE.Scene();
     this.blurScene.add(new THREE.Mesh(plane,this.blurMaterial));
     this.compositeScene=new THREE.Scene();
     this.compositeScene.add(new THREE.Mesh(
       plane.clone(),this.compositeMaterial));
     this.quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
   }
   this.compositeMaterial!.uniforms.tOriginal.value=this.original;
   this.compositeMaterial!.uniforms.tBlur.value=this.vertical!.texture;
   return true;
  }catch(error){
   this.failure='initialization-failed';
   this.disposeBuffers();
   console.warn('Tilt-shift focus disabled:',error);
   return false;
  }
 }
 /** One world draw, 2 quarter-res blur draws, 1 display composite.
  * Draw protected pixels only once via discard (original framebuffer).
  * No actor/intel queries in this renderer.
  */
 render(scene:THREE.Scene,camera:THREE.Camera,
   decision:FocusDecision,
   cssWidth:number,cssHeight:number,
   anchors:readonly FocusPoint[]=[],
   debug:MiniatureFocusDebug=null,
   attention:THREE.Texture|null=null,
   zoomStrength=1):boolean{
   this.renderer.render(scene,camera);
   if((!decision.active&&!debug)||cssWidth<=0||cssHeight<=0||
      !this.init())return false;
   const previousTarget=this.renderer.getRenderTarget();
   const previousClear=this.renderer.autoClear;
   const b=this.blurMaterial!.uniforms;
   const c=this.compositeMaterial!.uniforms;
   c.tAttention.value=attention??this.original;
   c.uHasAttention.value=attention?1:0;
   c.uZoomStrength.value=Math.max(0,Math.min(1,zoomStrength));
   c.uCenterY.value=decision.centerY;
   c.uInnerHalf.value=decision.innerHalfHeight;
   c.uOuterHalf.value=decision.outerHalfHeight;
   c.uStrength.value=decision.strength;
   c.uSaturation.value=decision.saturation;
   c.uContrast.value=decision.contrast;
   c.uDebug.value=debug==='band'?3:debug==='protected'?2:
     debug==='mask'?1:0;
   c.uAnchorCount.value=Math.min(anchors.length,MINIATURE_FOCUS_MAX_ANCHORS);
   const vectors=c.uAnchors.value as THREE.Vector4[];
   for(let i=0;i<c.uAnchorCount.value;i++){
     const a=anchors[i];
     // Only selected/featured actors get local sharpening protection.
     vectors[i].set(a.x/cssWidth,1-a.y/cssHeight,
       40/cssWidth,60/cssHeight);
   }
   try{
     this.renderer.copyFramebufferToTexture(this.original!);
     this.renderer.autoClear=true;
     b.tDiffuse.value=this.original;
     b.uBlurStep.value.set(decision.radiusPx/this.width,0);
     this.renderer.setRenderTarget(this.horizontal!);
     this.renderer.render(this.blurScene!,this.quadCamera!);
     b.tDiffuse.value=this.horizontal!.texture;
     b.uBlurStep.value.set(0,decision.radiusPx/this.height);
     this.renderer.setRenderTarget(this.vertical!);
     this.renderer.render(this.blurScene!,this.quadCamera!);
     this.renderer.setRenderTarget(null);
     // Original canvas remains intact wherever mask=0.
     this.renderer.autoClear=false;
     this.renderer.render(this.compositeScene!,this.quadCamera!);
     this.renderCount++;
     return true;
   }catch(error){
     this.failure='render-failed';
     console.warn('Tilt-shift focus falling back to native frame:',error);
     this.disposeBuffers();
     this.renderer.setRenderTarget(null);
     this.renderer.autoClear=previousClear;
     this.renderer.render(scene,camera);
     return false;
   }finally{
     this.renderer.setRenderTarget(previousTarget);
     this.renderer.autoClear=previousClear;
   }
 }
 getDiagnostics(){
  return {
   reason:this.failure??'ready',width:this.width,height:this.height,
   downsampleWidth:this.smallWidth,downsampleHeight:this.smallHeight,
   allocations:this.allocationCount,frames:this.renderCount,
   path:'final-framebuffer-quarter-res-tilt-shift',
   format:this.original?.type??null
  };
 }
 resetTemporalState():void{/* Frame-to-frame independent. */}
 private disposeBuffers():void{
   this.original?.dispose();this.original=null;
   this.horizontal?.dispose();this.horizontal=null;
   this.vertical?.dispose();this.vertical=null;
 }
 dispose():void{
  this.disposeBuffers();
  for(const scene of [this.blurScene,this.compositeScene])
   scene?.traverse(obj=>{
    if(obj instanceof THREE.Mesh)obj.geometry.dispose();
   });
  this.blurMaterial?.dispose();this.compositeMaterial?.dispose();
  this.blurMaterial=null;this.compositeMaterial=null;
  this.blurScene=null;this.compositeScene=null;this.quadCamera=null;
  this.width=this.height=this.smallWidth=this.smallHeight=0;
 }
}
