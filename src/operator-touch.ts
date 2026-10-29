/** Build 043 — touch grammar recovered from the original 0.0.2 prototype.
 * All gestures have one owner, and pointer-cancel/blur clears drive input.
 */
export type Axis={x:number;y:number};
export function stickAxis(dx:number,dy:number,radius=54):Axis{
 const m=Math.hypot(dx,dy),dz=.12;
 if(m<=radius*dz)return {x:0,y:0};
 const strength=(Math.min(m/radius,1)-dz)/(1-dz);
 return {x:dx/m*strength,y:-dy/m*strength};
}
export function screenDirection(axis:Axis,yaw:number):{x:number;z:number}{
 return {x:axis.x*Math.cos(yaw)-axis.y*Math.sin(yaw),
   z:-axis.x*Math.sin(yaw)-axis.y*Math.cos(yaw)};
}
export function stickZone(x:number,y:number,width:number,height:number):'left'|'right'|null{
 if(y<height*.42)return null;
 return x<width*.5?'left':'right';
}
export function independentSticks(a:{x:number;y:number},b:{x:number;y:number},
 width:number,height:number):boolean{
 const aa=stickZone(a.x,a.y,width,height),bb=stickZone(b.x,b.y,width,height);
 return !!aa&&!!bb&&aa!==bb&&Math.hypot(a.x-b.x,a.y-b.y)>=Math.min(180,width*.37);
}
type Role='pending'|'left'|'right'|'pan'|'orbit'|'gesture';
type Point={id:number;x:number;y:number;startX:number;startY:number;role:Role;zone:'left'|'right'|null;type:string};
type CameraActions={orbit:(dx:number,dy:number)=>void;pan:(dx:number,dy:number)=>void;zoom:(factor:number)=>void};
export class FloatingTouchControls{
 readonly move:Axis={x:0,y:0};
 enabled=true;
 private readonly right:Axis={x:0,y:0};
 private readonly pointers=new Map<number,Point>();
 private readonly bases:Record<'left'|'right',HTMLElement>;
 private readonly knobs:Record<'left'|'right',HTMLElement>;
 private readonly canvas:HTMLCanvasElement;
 private readonly camera:CameraActions;
 private readonly onTap:(x:number,y:number)=>void;
 private hadMultiple=false;
 private gesture:{x:number;y:number;dist:number;angle:number}|null=null;
 private readonly radius=54;
 constructor(canvas:HTMLCanvasElement,camera:CameraActions,onTap:(x:number,y:number)=>void){
   this.canvas=canvas;this.camera=camera;this.onTap=onTap;
   const make=(side:'left'|'right')=>{
     const b=document.createElement('div');
     b.className='floating-stick floating-stick--'+side;
     b.innerHTML='<div class="stick-ring"></div><div class="stick-knob"></div><span class="stick-caption">'+
       (side==='left'?'MOVE':'LOOK')+'</span>';
     b.setAttribute('aria-hidden','true');document.body.append(b);return b;
   };
   this.bases={left:make('left'),right:make('right')};
   this.knobs={left:this.bases.left.querySelector<HTMLElement>('.stick-knob')!,
     right:this.bases.right.querySelector<HTMLElement>('.stick-knob')!};
   canvas.addEventListener('pointerdown',this.down);
   canvas.addEventListener('pointermove',this.drag);
   canvas.addEventListener('pointerup',this.up);
   canvas.addEventListener('pointercancel',this.cancel);
   canvas.addEventListener('lostpointercapture',this.cancel);
   canvas.addEventListener('contextmenu',this.noContext);
   window.addEventListener('blur',this.blur);
 }
 private noContext=(e:Event)=>e.preventDefault();
 private blur=()=>this.reset();
 get driving():boolean{return [...this.pointers.values()].some(p=>p.role==='left');}
 private hide(side:'left'|'right'){
   this.bases[side].classList.remove('visible');
   const axis=side==='left'?this.move:this.right;axis.x=axis.y=0;
 }
 private show(side:'left'|'right',p:Point){
   const bounds=this.canvas.getBoundingClientRect(),base=this.bases[side];
   const x=Math.max(62,Math.min(bounds.width-62,p.startX-bounds.left));
   const y=Math.max(75,Math.min(bounds.height-70,p.startY-bounds.top));
   base.style.left=x+'px';base.style.top=y+'px';
   base.classList.add('visible');
   this.knobs[side].style.transform='translate(-50%,-50%)';
 }
 private pairInfo(){
   const a=[...this.pointers.values()];
   if(a.length!==2)return null;
   return {x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,
     dist:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),
     angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)};
 }
 private down=(e:PointerEvent)=>{
   e.preventDefault();this.canvas.setPointerCapture(e.pointerId);
   const bounds=this.canvas.getBoundingClientRect();
   const touch=e.pointerType==='touch'||e.pointerType==='pen';
   const zone=this.enabled&&touch?stickZone(e.clientX-bounds.left,e.clientY-bounds.top,bounds.width,bounds.height):null;
   this.pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY,
     startX:e.clientX,startY:e.clientY,role:e.button===2?'orbit':'pending',
     zone,type:e.pointerType});
   if(this.pointers.size===1){this.hadMultiple=false;this.gesture=null;}
   if(this.pointers.size===2){
     this.hadMultiple=true;
     const pair=[...this.pointers.values()];
     if(!independentSticks(
       {x:pair[0].startX-bounds.left,y:pair[0].startY-bounds.top},
       {x:pair[1].startX-bounds.left,y:pair[1].startY-bounds.top},
       bounds.width,bounds.height)){
       pair.forEach(p=>p.role='gesture');
       this.hide('left');this.hide('right');
       this.gesture=this.pairInfo();
     }
   }
 };
 private drag=(e:PointerEvent)=>{
   const p=this.pointers.get(e.pointerId);if(!p)return;
   e.preventDefault();
   const dx=e.clientX-p.x,dy=e.clientY-p.y;
   p.x=e.clientX;p.y=e.clientY;
   if(p.role==='gesture'){
     const now=this.pairInfo();
     if(!now||!this.gesture)return;
     this.camera.pan(now.x-this.gesture.x,now.y-this.gesture.y);
     if(now.dist>8&&this.gesture.dist>8)this.camera.zoom(now.dist/this.gesture.dist);
     const twist=Math.atan2(Math.sin(now.angle-this.gesture.angle),
       Math.cos(now.angle-this.gesture.angle));
     this.camera.orbit(-twist*125,0);
     this.gesture=now;return;
   }
   if(p.role==='pending'){
     if(Math.hypot(p.x-p.startX,p.y-p.startY)<(p.type==='mouse'?5:12))return;
     if(p.zone&&p.type!=='mouse'){
       p.role=p.zone;
       this.show(p.role,p);
     }else p.role=p.type==='mouse'&&e.shiftKey?'pan':'orbit';
   }
   if(p.role==='left'||p.role==='right'){
     const side=p.role,axis=stickAxis(p.x-p.startX,p.y-p.startY,this.radius);
     const dest=side==='left'?this.move:this.right;
     dest.x=axis.x;dest.y=axis.y;
     const bounds=this.canvas.getBoundingClientRect();
     const cx=bounds.left+parseFloat(this.bases[side].style.left);
     const cy=bounds.top+parseFloat(this.bases[side].style.top);
     const px=p.x-cx,py=p.y-cy,len=Math.max(1,Math.hypot(px,py));
     const factor=Math.min(1,this.radius/len);
     this.knobs[side].style.transform='translate(calc(-50% + '+(px*factor)+'px),calc(-50% + '+(py*factor)+'px))';
   }else if(p.role==='pan')this.camera.pan(dx,dy);
   else if(p.role==='orbit')this.camera.orbit(dx,dy);
 };
 private finish(e:PointerEvent,cancelled:boolean){
   const p=this.pointers.get(e.pointerId);if(!p)return;
   const tap=!cancelled&&!this.hadMultiple&&p.role==='pending'&&
     Math.hypot(p.x-p.startX,p.y-p.startY)<12;
   if(p.role==='left'||p.role==='right')this.hide(p.role);
   this.pointers.delete(e.pointerId);
   if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
   if(this.pointers.size<2){
     this.gesture=null;
     this.pointers.forEach(other=>{if(other.role==='gesture')other.role='pan';});
   }
   if(!this.pointers.size)this.hadMultiple=false;
   if(tap)this.onTap(e.clientX,e.clientY);
 }
 private up=(e:PointerEvent)=>this.finish(e,false);
 private cancel=(e:PointerEvent)=>this.finish(e,true);
 update(dt:number){if(this.right.x||this.right.y)this.camera.orbit(
   this.right.x*dt*270,this.right.y*dt*160);}
 reset(){
   this.pointers.clear();this.gesture=null;this.hadMultiple=false;
   this.hide('left');this.hide('right');
 }
 dispose(){
   this.reset();
   this.canvas.removeEventListener('pointerdown',this.down);
   this.canvas.removeEventListener('pointermove',this.drag);
   this.canvas.removeEventListener('pointerup',this.up);
   this.canvas.removeEventListener('pointercancel',this.cancel);
   this.canvas.removeEventListener('lostpointercapture',this.cancel);
   this.canvas.removeEventListener('contextmenu',this.noContext);
   window.removeEventListener('blur',this.blur);
   this.bases.left.remove();this.bases.right.remove();
 }
}
