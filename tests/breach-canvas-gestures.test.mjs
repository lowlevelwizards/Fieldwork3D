import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreachCanvasGestureController}
  from '../src/breach-canvas-gesture-controller.ts';

class Canvas extends EventTarget{
  dataset={};
  captured=new Set();
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
}
function pointer(canvas,type,id,x,y,props={}){
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,
    button:0,buttons:1,shiftKey:false,...props});
  canvas.dispatchEvent(event);
  return event;
}
function setup(){
  const previousWindow=globalThis.window;
  const previousDocument=globalThis.document;
  globalThis.window=new EventTarget();
  globalThis.document=new EventTarget();
  globalThis.document.hidden=false;
  const canvas=new Canvas();
  const releases=[],movements=[],selection=[],modes=[];
  let unit=false,armed=false,planning=true,is3D=true;
  const controller=createBreachCanvasGestureController(canvas);
  controller.install({
    is3D:()=>is3D,
    isPlanning:()=>planning,
    isLooking:()=>false,
    targetArmed:()=>armed,
    world:e=>({x:e.clientX,y:e.clientY}),
    aimWorld:e=>({x:e.clientX,y:e.clientY}),
    pick:()=>unit?{kind:'operator',owner:'rook',corePx:20,distancePx:0}:null,
    selection:()=>({owner:'rook',node:null,watch:false,door:null}),
    restoreSelection:()=>selection.push('restore'),
    activateEdit:()=>selection.push('edit'),
    adoptOwner:()=>selection.push('adopt'),
    cursor:()=>{},
    hover:()=>{},
    clearDrag:()=>{},
    dragNode:()=>movements.push('node'),
    traceRoute:()=>movements.push('route'),
    orbit:()=>movements.push('orbit'),
    pan:()=>movements.push('pan'),
    pinch:(_a,_b,ratio)=>movements.push('pinch:'+ratio.toFixed(2)),
    release:(_e,p,cancelled,count)=>releases.push({
      mode:p.mode,moved:p.moved,cancelled,count
    }),
    complete:()=>{},
    wheel:()=>movements.push('wheel')
  });
  return {
    canvas,controller,releases,movements,selection,modes,
    unit:value=>{unit=value;},
    armed:value=>{armed=value;},
    planning:value=>{planning=value;},
    mode3D:value=>{is3D=value;},
    cleanup:()=>{
      controller.dispose();
      if(previousWindow===undefined)delete globalThis.window;
      else globalThis.window=previousWindow;
      if(previousDocument===undefined)delete globalThis.document;
      else globalThis.document=previousDocument;
    }
  };
}
test('one-finger tap keeps tactical intent until release',()=>{
  const s=setup();
  try{
    pointer(s.canvas,'pointerdown',1,80,90);
    assert.equal(s.controller.activePointers.size,1);
    pointer(s.canvas,'pointerup',1,80,90);
    assert.deepEqual(s.releases,[{
      mode:'undecided',moved:false,cancelled:false,count:1
    }]);
    assert.equal(s.controller.activePointers.size,0);
    assert.equal(s.canvas.captured.size,0);
  }finally{s.cleanup();}
});
test('empty-space finger drag becomes orbit, not a route',()=>{
  const s=setup();
  try{
    pointer(s.canvas,'pointerdown',1,80,90);
    pointer(s.canvas,'pointermove',1,110,115);
    assert.equal(s.controller.activePointers.get(1).mode,'cameraOrbit');
    assert.deepEqual(s.movements,['orbit']);
    pointer(s.canvas,'pointerup',1,110,115);
    assert.equal(s.releases[0].mode,'cameraOrbit');
  }finally{s.cleanup();}
});
test('operator-origin drag stays a route, Floor Plan drags pan',()=>{
  const s=setup();
  try{
    s.unit(true);
    pointer(s.canvas,'pointerdown',1,70,70);
    pointer(s.canvas,'pointermove',1,90,95);
    assert.equal(s.controller.activePointers.get(1).mode,'route');
    assert.deepEqual(s.movements,['route']);
    pointer(s.canvas,'pointerup',1,90,95);
    s.unit(false);s.mode3D(false);
    pointer(s.canvas,'pointerdown',2,70,70);
    pointer(s.canvas,'pointermove',2,100,100);
    assert.equal(s.controller.activePointers.get(2).mode,'cameraPan');
    assert.ok(s.movements.includes('pan'));
  }finally{s.cleanup();}
});
test('second touch cancels authoring and surviving finger exits pinch',()=>{
  const s=setup();
  try{
    s.unit(true);
    pointer(s.canvas,'pointerdown',1,100,100);
    pointer(s.canvas,'pointermove',1,120,120);
    assert.equal(s.controller.activePointers.get(1).mode,'route');
    pointer(s.canvas,'pointerdown',2,180,180);
    assert.deepEqual([...s.controller.activePointers.values()].map(p=>p.mode),
      ['cameraMulti','cameraMulti']);
    pointer(s.canvas,'pointermove',2,200,200);
    assert.ok(s.movements.some(x=>x.startsWith('pinch:')));
    pointer(s.canvas,'pointerup',2,200,200);
    assert.equal(s.controller.activePointers.get(1).mode,'cameraOrbit');
    pointer(s.canvas,'pointerup',1,120,120);
    assert.deepEqual(s.releases.map(x=>x.mode),['cameraMulti','cameraOrbit']);
    assert.equal(s.controller.activePointers.size,0);
  }finally{s.cleanup();}
});
test('interrupted pointer capture cancels without retaining ghost contacts',()=>{
  const s=setup();
  try{
    pointer(s.canvas,'pointerdown',1,100,100);
    pointer(s.canvas,'lostpointercapture',1,130,130);
    assert.equal(s.releases[0].cancelled,true);
    assert.equal(s.controller.activePointers.size,0);
    pointer(s.canvas,'pointerdown',2,10,10);
    globalThis.window.dispatchEvent(new Event('blur'));
    assert.equal(s.controller.activePointers.size,0);
    assert.equal(s.canvas.captured.size,0);
  }finally{s.cleanup();}
});
test('touch reconciliation drops stale extra fingers without an order',()=>{
  const s=setup();
  try{
    pointer(s.canvas,'pointerdown',1,10,10);
    pointer(s.canvas,'pointerdown',2,100,100);
    const end=new Event('touchend');
    Object.assign(end,{touches:[{clientX:10,clientY:10}]});
    globalThis.window.dispatchEvent(end);
    assert.equal(s.controller.activePointers.size,1);
    assert.equal(s.controller.activePointers.get(1).mode,'cameraOrbit');
    assert.equal(s.releases.length,0);
    const wheel=new Event('wheel',{cancelable:true});
    Object.assign(wheel,{deltaY:-120,clientX:100,clientY:100});
    s.canvas.dispatchEvent(wheel);
    assert.ok(s.movements.includes('wheel'));
    assert.equal(wheel.defaultPrevented,true);
  }finally{s.cleanup();}
});
test('armed target drag previews instead of panning and multi-touch never targets',()=>{
  const s=setup();
  try{
    s.armed(true);
    pointer(s.canvas,'pointerdown',1,10,10);
    pointer(s.canvas,'pointermove',1,40,40);
    assert.equal(s.controller.activePointers.get(1).mode,'targetPreview');
    assert.deepEqual(s.movements,[]);
    pointer(s.canvas,'pointerdown',2,100,100);
    assert.equal(s.controller.activePointers.get(1).mode,'cameraMulti');
    pointer(s.canvas,'pointerup',2,100,100);
    assert.equal(s.controller.activePointers.get(1).mode,'cameraOrbit');
  }finally{s.cleanup();}
});
