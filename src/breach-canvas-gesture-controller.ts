import type {Pt} from './breach-core.ts';
import {matchActiveTouchPointers} from './breach-touch-recovery.ts';
import {tacticalHitProfile} from './ui/touch-hit-targets.ts';
import {watchDragReady,type TacticalPick} from './ui/tactical-target-resolver.ts';

/** Low-level input intent only. Mission orders and selection commits belong to the caller. */
export type TacticalPointerMode='undecided'|'route'|'pan'|'node'|'watchTarget'|
  'activeWatch'|'pivot'|'sweep'|'cameraOrbit'|'cameraPan'|'cameraMulti'|'targetPreview';
export type TacticalPointerSelection={
  owner:string;node:number|null;watch:boolean;door:string|null
};
export type TacticalPointer={
  x:number;y:number;startX:number;startY:number;
  pointerType:string;wasUnit:boolean;nodeId:number|null;
  pick?:TacticalPick|null;dragCommitted?:boolean;
  selectionBefore?:TacticalPointerSelection;
  mode:TacticalPointerMode;moved:boolean;
};
export type TacticalCanvasGestureCallbacks={
  is3D:()=>boolean;
  isPlanning:()=>boolean;
  isLooking:()=>boolean;
  targetArmed:()=>boolean;
  world:(event:PointerEvent)=>Pt;
  aimWorld:(event:PointerEvent,height?:number)=>Pt;
  pick:(screen:Pt,pointerKind:string)=>TacticalPick|null;
  selection:()=>TacticalPointerSelection;
  restoreSelection:(pointer:TacticalPointer)=>void;
  activateEdit:(pointer:TacticalPointer)=>void;
  adoptOwner:(pointer:TacticalPointer)=>void;
  cursor:(point:Pt)=>void;
  hover:(active:boolean,point?:Pt)=>void;
  clearDrag:()=>void;
  dragNode:(point:Pt,watch:boolean)=>void;
  traceRoute:(screen:Pt,world:Pt)=>void;
  orbit:(dx:number,dy:number)=>void;
  pan:(dx:number,dy:number)=>void;
  pinch:(previous:Pt|null,current:Pt,ratio:number)=>void;
  release:(event:PointerEvent,pointer:TacticalPointer,cancelled:boolean,
    pointerCount:number)=>void;
  complete:()=>void;
  wheel:(event:WheelEvent)=>void;
};

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const cameraGesture=(mode:TacticalPointerMode)=>mode==='cameraMulti'||
  mode==='cameraOrbit'||mode==='cameraPan';

/** Owns pointer capture, gesture arbitration, multi-touch recovery and cleanup.
 * A second finger cancels authoring before the gesture can commit an order.
 * The tactical commit callback is invoked exactly once, before releasing state.
 */
export function createBreachCanvasGestureController(canvas:HTMLCanvasElement){
  const activePointers=new Map<number,TacticalPointer>();
  let pinchDistance=0,panMid:Pt|null=null;
  let installed=false;
  let callbacks:TacticalCanvasGestureCallbacks|null=null;
  const probe=(phase:string)=>{
    if(!import.meta.env.DEV)return;
    canvas.dataset.gesturePhase=phase;
    canvas.dataset.gestureCount=String(activePointers.size);
    canvas.dataset.gestureModes=[...activePointers.values()].map(p=>p.mode).join(',');
  };
  const settle=()=>{
    if(activePointers.size>=2){
      const [a,b]=[...activePointers.values()];
      pinchDistance=distance(a,b);
      panMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    }else{
      panMid=null;pinchDistance=0;
      if(activePointers.size===1){
        const remaining=[...activePointers.values()][0];
        if(remaining.mode==='cameraMulti'){
          remaining.mode=callbacks?.is3D()?'cameraOrbit':'cameraPan';
          remaining.moved=true;
          remaining.startX=remaining.x;remaining.startY=remaining.y;
        }
      }
    }
  };
  const clear=()=>{
    const ids=[...activePointers.keys()];
    activePointers.clear();
    for(const id of ids){
      if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    }
    panMid=null;pinchDistance=0;
    callbacks?.clearDrag();
    probe('clear');
  };
  const reconcileTouches=(event:TouchEvent)=>{
    const cb=callbacks;if(!cb)return;
    const touchPointers=new Map([...activePointers].filter(
      ([,pointer])=>pointer.pointerType==='touch'));
    const live=Array.from(event.touches,t=>({x:t.clientX,y:t.clientY}));
    if(touchPointers.size<=live.length)return;
    // A single tactical finger must reach pointerup to commit its tap.
    if(touchPointers.size===1&&live.length===0&&
      !cameraGesture([...touchPointers.values()][0].mode))return;
    const retained=matchActiveTouchPointers(touchPointers,live);
    let pruned=false;
    for(const id of touchPointers.keys()){
      if(retained.has(id))continue;
      activePointers.delete(id);
      if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
      pruned=true;
    }
    if(!pruned)return;
    cb.clearDrag();settle();probe('touch-recovered');
  };
  const pointerDown=(e:PointerEvent)=>{
    const cb=callbacks;if(!cb)return;
    e.preventDefault();canvas.setPointerCapture(e.pointerId);
    cb.cursor(cb.isLooking()?cb.aimWorld(e):cb.world(e));
    if(e.pointerType==='touch')cb.hover(false);
    const explicitCamera=e.button===1||e.shiftKey||(cb.is3D()&&e.button===2);
    if(explicitCamera){
      const orbit=cb.is3D()&&e.button===2;
      activePointers.set(e.pointerId,{
        x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,
        pointerType:e.pointerType,wasUnit:false,nodeId:null,
        mode:orbit?'cameraOrbit':'cameraPan',moved:false
      });
    }else{
      const pick=cb.targetArmed()?null:cb.pick(
        {x:e.clientX,y:e.clientY},e.pointerType);
      const mode:TacticalPointerMode=pick?.kind==='activeWatch'?'activeWatch':
        pick?.kind==='watch'?'watchTarget':
        pick&&['node','flash','problem'].includes(pick.kind)?'node':'undecided';
      activePointers.set(e.pointerId,{
        x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,
        pointerType:e.pointerType,wasUnit:pick?.kind==='operator',
        nodeId:pick?.nodeId??null,pick,mode,moved:false,dragCommitted:false,
        selectionBefore:cb.selection()
      });
    }
    if(activePointers.size>=2){
      for(const pointer of activePointers.values()){
        if(pointer.dragCommitted)cb.restoreSelection(pointer);
        pointer.mode='cameraMulti';pointer.dragCommitted=false;
      }
      settle();cb.clearDrag();
    }
    probe('down');
  };
  const pointerMove=(e:PointerEvent)=>{
    const cb=callbacks;if(!cb)return;
    const p=activePointers.get(e.pointerId);
    const point=cb.isLooking()?cb.aimWorld(e):
      p&&(p.mode==='activeWatch'||p.mode==='watchTarget')?
        cb.aimWorld(e,12):cb.world(e);
    cb.cursor(point);
    if(!p)return;
    e.preventDefault();
    const dx=e.clientX-p.x,dy=e.clientY-p.y;
    p.x=e.clientX;p.y=e.clientY;
    if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>
      tacticalHitProfile(e.pointerType).dragStart)p.moved=true;
    if(activePointers.size>=2){
      const [a,b]=[...activePointers.values()];
      const gap=distance(a,b);
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      cb.pinch(panMid,mid,pinchDistance>8?gap/pinchDistance:1);
      panMid=mid;pinchDistance=gap;
      return;
    }
    if(p.mode==='cameraOrbit'&&cb.is3D()){
      cb.orbit(dx,dy);probe('orbit');return;
    }
    if(p.mode==='cameraPan'){
      cb.pan(dx,dy);return;
    }
    if(p.mode==='cameraMulti')return;
    if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
      cb.targetArmed()){
      p.mode='targetPreview';return;
    }
    if(p.mode==='targetPreview')return;
    if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
      !(cb.isPlanning()&&p.wasUnit)){
      p.mode=cb.is3D()?'cameraOrbit':'cameraPan';
      if(p.mode==='cameraOrbit')cb.orbit(dx,dy);
      else cb.pan(dx,dy);
      return;
    }
    if(p.mode==='activeWatch'||p.mode==='watchTarget'){
      const travel=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
      if(watchDragReady(travel,e.pointerType)&&
        (p.mode==='activeWatch'||p.nodeId!==null)){
        if(!p.dragCommitted)cb.activateEdit(p);
        p.dragCommitted=true;cb.dragNode(point,true);
      }
      return;
    }
    if(p.mode==='node'&&p.moved&&p.nodeId!==null){
      if(!p.dragCommitted)cb.activateEdit(p);
      p.dragCommitted=true;cb.dragNode(point,false);return;
    }
    if(cb.isPlanning()&&p.wasUnit&&p.moved){
      if(!p.dragCommitted)cb.adoptOwner(p);
      p.dragCommitted=true;p.mode='route';
      cb.traceRoute({x:e.clientX,y:e.clientY},point);
    }else if(p.moved&&e.pointerType==='mouse'&&(e.buttons&4)){
      cb.pan(dx,dy);
    }
  };
  const pointerRelease=(e:PointerEvent,cancelled=false)=>{
    const cb=callbacks,p=activePointers.get(e.pointerId);
    if(!cb||!p)return;
    if(cancelled&&p.dragCommitted)cb.restoreSelection(p);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    cb.release(e,p,cancelled,activePointers.size);
    cb.clearDrag();
    activePointers.delete(e.pointerId);
    if(e.pointerType==='touch')cb.hover(false);
    settle();probe('up');cb.complete();
  };
  const pointerEnter=(e:PointerEvent)=>{
    if(e.pointerType!=='touch')callbacks?.hover(true,callbacks.world(e));
  };
  const pointerLeave=()=>callbacks?.hover(false);
  const pointerUp=(e:PointerEvent)=>pointerRelease(e);
  const pointerCancel=(e:PointerEvent)=>pointerRelease(e,true);
  const hidden=()=>{if(document.hidden)clear();};
  const preventDefault=(e:Event)=>e.preventDefault();
  const onWheel=(e:WheelEvent)=>{
    e.preventDefault();callbacks?.wheel(e);
  };
  const touches=['touchstart','touchmove','touchend','touchcancel'] as const;
  const gestures=['gesturestart','gesturechange','gestureend'] as const;
  const install=(cb:TacticalCanvasGestureCallbacks)=>{
    if(installed)throw new Error('Tactical canvas gestures installed twice');
    installed=true;callbacks=cb;
    canvas.addEventListener('contextmenu',preventDefault);
    canvas.addEventListener('pointerenter',pointerEnter);
    canvas.addEventListener('pointerleave',pointerLeave);
    canvas.addEventListener('pointerdown',pointerDown);
    canvas.addEventListener('pointermove',pointerMove);
    canvas.addEventListener('pointerup',pointerUp);
    canvas.addEventListener('pointercancel',pointerCancel);
    canvas.addEventListener('lostpointercapture',pointerCancel);
    for(const name of touches)
      window.addEventListener(name,reconcileTouches,{capture:true,passive:true});
    window.addEventListener('blur',clear);
    window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',hidden);
    for(const name of gestures)
      canvas.addEventListener(name,preventDefault,{passive:false});
    canvas.addEventListener('wheel',onWheel,{passive:false});
  };
  const dispose=()=>{
    if(!installed)return;
    clear();installed=false;callbacks=null;
    canvas.removeEventListener('contextmenu',preventDefault);
    canvas.removeEventListener('pointerenter',pointerEnter);
    canvas.removeEventListener('pointerleave',pointerLeave);
    canvas.removeEventListener('pointerdown',pointerDown);
    canvas.removeEventListener('pointermove',pointerMove);
    canvas.removeEventListener('pointerup',pointerUp);
    canvas.removeEventListener('pointercancel',pointerCancel);
    canvas.removeEventListener('lostpointercapture',pointerCancel);
    for(const name of touches)
      window.removeEventListener(name,reconcileTouches,true);
    window.removeEventListener('blur',clear);
    window.removeEventListener('pagehide',clear);
    document.removeEventListener('visibilitychange',hidden);
    for(const name of gestures)
      canvas.removeEventListener(name,preventDefault);
    canvas.removeEventListener('wheel',onWheel);
  };
  return {activePointers,install,clear,dispose};
}
