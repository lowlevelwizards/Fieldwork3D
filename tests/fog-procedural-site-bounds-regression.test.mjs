/** Procedural fog regression: mask, 2D projection and 3D footprint agree. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {paintFogMemory} from '../src/breach-fog-mask.ts';
import {exteriorKnownFogRects} from '../src/breach-fog-domain.ts';
import {buildExteriorKnownFogGeometry}
 from '../src/rendering/breach-fog-mesh-composition.ts';
import {createBreach2DVisibilityRenderer}
 from '../src/breach-2d-visibility-renderer.ts';

const room=(id,x,y,w,h)=>({id,x,y,w,h,kind:'room',tone:0});
const site={
 seed:90210,bounds:{minX:-90,minY:-80,maxX:830,maxY:960},
 rooms:[
  room('N',100,110,260,40),
  room('W',100,150,40,240),
  room('E',320,150,40,240)
 ]
};
function context(canvas,draws=[]){
 return {
  canvas,filter:'none',fillStyle:'#000',
  globalCompositeOperation:'source-over',
  save(){},restore(){},setTransform(){},clearRect(){},
  fillRect(...args){draws.push({op:this.globalCompositeOperation,
    color:this.fillStyle,args});},
  drawImage(){},beginPath(){},rect(){},fill(){},clip(){},
  moveTo(){},lineTo(){},closePath(){}
 };
}
const state={
 site,intel:{mode:'exterior-known'},
 operators:[],doors:[],seconds:0,objectRevision:0,
 seenGround:new Set(),seenGroundRevision:0
};
test('procedural exterior-known mask re-covers only physical modules',()=>{
 const draws=[];
 paintFogMemory(context({width:1,height:1},draws),state);
 const shape=exteriorKnownFogRects(site);
 assert.equal(exteriorKnownFogRects(site),shape,
  'footprint should be memoized by site identity');
 const covered=draws.filter(d=>d.op==='source-over'&&d.args[2]!==undefined);
 // One initial mask fill plus the exact shared concealed rects.
 assert.equal(covered.length,shape.length+1);
 for(const r of shape){
  assert.ok(covered.some(d=>d.args[0]===r.x&&d.args[1]===r.y&&
   d.args[2]===r.w&&d.args[3]===r.h));
 }
 // Exterior is erased once at site bounds, not via a grid of tiny patches.
 const clears=draws.filter(d=>d.op==='destination-out');
 assert.equal(clears.length,1);
 assert.deepEqual(clears[0].args,[-90,-80,920,1040]);
});
test('procedural exterior-known mesh has no quad above open outside court',()=>{
 const geometry=buildExteriorKnownFogGeometry(site);
 const pos=geometry.getAttribute('position');
 const shape=exteriorKnownFogRects(site);
 assert.equal(pos.count,shape.length*4);
 const hasTriangleFootprint=(x,y)=>shape.some(r=>
  x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);
 assert.equal(hasTriangleFootprint(120,130),true);
 assert.equal(hasTriangleFootprint(220,240),false);
 assert.equal(hasTriangleFootprint(500,240),false);
 geometry.dispose();
});
test('2D repaint places variable-size procedural mask at site bounds',()=>{
 const previous=globalThis.document;
 const draws=[];
 globalThis.document={
  createElement:()=>{
   const canvas={width:320,height:370};
   canvas.getContext=()=>context(canvas);
   return canvas;
  }
 };
 try{
  const renderer=createBreach2DVisibilityRenderer({
   draw:{drawImage:(...args)=>draws.push(args)},
   getState:()=>state,
   isReplaying:()=>false,
   getViewMode:()=> 'plan2d',
   replayKnowledge:{},
   replayPlayback:{},
   debugPalette:false
  });
  renderer.renderFog();
  assert.equal(draws.length,1);
  assert.deepEqual(draws[0].slice(1),[-90,-80,920,1040]);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
