/** MF-4: low-resolution screen-space tactical attention matte.
 * The game supplies ALREADY DISCLOSED shapes. No weapon/actor truth or
 * visibility authority is consulted by this renderer.
 */
import * as THREE from 'three';
import {attentionRelease} from './miniature-attention-policy.ts';

export type AttentionPoint={x:number;y:number};
export type AttentionPolygon={
 points:readonly AttentionPoint[];importance:number
};
export type AttentionDisc={
 x:number;y:number;radiusX:number;radiusY:number;importance:number
};
const clamp=(value:number,min:number,max:number)=>
 Math.max(min,Math.min(max,value));

export class MiniatureAttentionMask{
 private canvas:HTMLCanvasElement;
 private canvasContext:CanvasRenderingContext2D;
 private desired:HTMLCanvasElement;
 private desiredContext:CanvasRenderingContext2D;
 readonly texture:THREE.CanvasTexture;
 private elapsed=.20;
 private width=0;private height=0;
 private readonly ratio=4;
 private revisions=0;
 private lastVisiblePixels=0;
 constructor(){
  this.canvas=document.createElement('canvas');
  this.desired=document.createElement('canvas');
  const output=this.canvas.getContext('2d',{
    willReadFrequently:true});
  const desired=this.desired.getContext('2d',{
    willReadFrequently:true});
  if(!output||!desired)throw new Error('Focus matte 2D canvas unavailable');
  this.canvasContext=output;this.desiredContext=desired;
  this.canvas.width=this.desired.width=1;
  this.canvas.height=this.desired.height=1;
  this.texture=new THREE.CanvasTexture(this.canvas);
  this.texture.colorSpace=THREE.NoColorSpace;
  this.texture.minFilter=THREE.LinearFilter;
  this.texture.magFilter=THREE.LinearFilter;
  this.texture.wrapS=this.texture.wrapT=THREE.ClampToEdgeWrapping;
 }
 private resize(w:number,h:number):void{
  const smallWidth=Math.max(1,Math.ceil(w/this.ratio));
  const smallHeight=Math.max(1,Math.ceil(h/this.ratio));
  if(this.width===smallWidth&&this.height===smallHeight)return;
  this.width=this.desired.width=this.canvas.width=smallWidth;
  this.height=this.desired.height=this.canvas.height=smallHeight;
  this.reset();
 }
 reset():void{
  this.canvasContext.setTransform(1,0,0,1,0,0);
  this.canvasContext.clearRect(0,0,this.canvas.width,this.canvas.height);
  this.desiredContext.setTransform(1,0,0,1,0,0);
  this.desiredContext.clearRect(0,0,this.desired.width,this.desired.height);
  this.elapsed=.25;
  this.texture.needsUpdate=true;
 }
 /** Updates ~10 times/s; no per-frame full-res CPU work or GPU readbacks.
  * Newly relevant shapes acquire instantly. Old focus fades in ~0.5s,
  * independently of the 2.4s explicit new-revelation hold timer.
  */
 update(cssWidth:number,cssHeight:number,dt:number,
  polygons:readonly AttentionPolygon[],
  discs:readonly AttentionDisc[]):boolean{
  if(cssWidth<=0||cssHeight<=0||
     !Number.isFinite(cssWidth)||!Number.isFinite(cssHeight))return false;
  this.resize(cssWidth,cssHeight);
  this.elapsed+=Math.max(0,Math.min(.25,dt));
  if(this.elapsed<.09)return false;
  const elapsed=Math.max(.001,Math.min(.25,this.elapsed));
  this.elapsed=0;
  const ctx=this.desiredContext;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(0,0,this.width,this.height);
  // Soft fill in projected LOS polygons, respecting the geometric doorway,
  // window and wall occluders that produced those polygons.
  ctx.setTransform(this.width/cssWidth,0,0,
    this.height/cssHeight,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const p of polygons){
   if(p.points.length<3||p.points.length>1024)continue;
   const alpha=clamp(p.importance,0,1);
   if(!alpha)continue;
   ctx.save();
   ctx.filter='blur(3px)';
   ctx.fillStyle='rgba(255,255,255,'+alpha.toFixed(4)+')';
   ctx.beginPath();
   ctx.moveTo(p.points[0].x,p.points[0].y);
   for(let i=1;i<p.points.length;i++)
     ctx.lineTo(p.points[i].x,p.points[i].y);
   ctx.closePath();ctx.fill();
   ctx.restore();
  }
  ctx.filter='none';
  for(const disc of discs){
   if(![disc.x,disc.y,disc.radiusX,disc.radiusY,disc.importance]
     .every(Number.isFinite)||disc.radiusX<=0||disc.radiusY<=0)continue;
   const alpha=clamp(disc.importance,0,1);
   if(alpha<=0)continue;
   ctx.save();
   ctx.translate(disc.x,disc.y);
   ctx.scale(disc.radiusX,disc.radiusY);
   const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
   gradient.addColorStop(0,'rgba(255,255,255,'+alpha.toFixed(4)+')');
   gradient.addColorStop(.55,'rgba(255,255,255,'+
     (alpha*.98).toFixed(4)+')');
   gradient.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=gradient;
   ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
   ctx.restore();
  }
  // Copy alpha from the desired matte into grayscale R/G/B so the shader
  // can sample it as an ordinary NoColorSpace color texture.
  const desired=this.desiredContext.getImageData(
    0,0,this.width,this.height).data;
  const previous=this.canvasContext.getImageData(
    0,0,this.width,this.height);
  const dest=previous.data;
  let pixels=0;
  for(let i=0;i<dest.length;i+=4){
   const old=dest[i]/255,goal=desired[i+3]/255;
   const next=attentionRelease(old,goal,elapsed);
   const channel=Math.round(next*255);
   dest[i]=dest[i+1]=dest[i+2]=channel;dest[i+3]=255;
   if(channel>24)pixels++;
  }
  this.canvasContext.putImageData(previous,0,0);
  this.texture.needsUpdate=true;
  this.revisions++;this.lastVisiblePixels=pixels;
  return true;
 }
 diagnostics(){
  return {width:this.width,height:this.height,
   updates:this.revisions,protectedPixels:this.lastVisiblePixels};
 }
 dispose():void{this.texture.dispose();}
}
