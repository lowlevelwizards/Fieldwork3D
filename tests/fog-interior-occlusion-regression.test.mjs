import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintFogMemory,UNKNOWN_FOG_COLOR} from '../src/breach-fog-mask.ts';
import {exteriorBriefedAt} from '../src/breach-site-footprint.ts';
import {exteriorKnownFogRects} from '../src/breach-fog-domain.ts';

// A draw-call recorder: this verifies actual destination-out pass order,
// relative erasure and footprint placement without requiring headless WebGL.
function recorder(){
 const calls=[];
 const ctx={
  canvas:{width:640,height:740},filter:'none',
  fillStyle:'',strokeStyle:'',lineWidth:1,globalCompositeOperation:'source-over',
  _rects:[],
  save(){},restore(){},setTransform(){},clearRect(){},
  beginPath(){this._rects=[];},rect(...r){this._rects.push(r);},
  moveTo(){},lineTo(){},closePath(){},stroke(){},
  fill(){calls.push({kind:'path',mode:this.globalCompositeOperation,
    style:this.fillStyle,rects:[...this._rects]});},
  fillRect(...r){calls.push({kind:'rect',mode:this.globalCompositeOperation,
    style:this.fillStyle,rect:r});}
 };
 return {ctx,calls};
}
const seen=new Set(['fine:6,6','micro:12,12']);
const session=(mode,site=undefined)=>({
 site,intel:{mode},seenGround:seen,doors:[],operators:[]
});
const pathErases=calls=>calls.filter(c=>
 c.kind==='path'&&c.mode==='destination-out');
test('explored fine and micro footprints are composited once, not erased twice',()=>{
 const {ctx,calls}=recorder();
 paintFogMemory(ctx,session('true-blind'));
 const paths=pathErases(calls);
 assert.equal(paths.length,1,'overlapping micro + fine erases must share one fill');
 assert.equal(paths[0].style,'rgba(255,255,255,0.55)');
 assert.ok(paths[0].rects.some(r=>r[0]===120&&r[1]===120&&r[2]===20));
 assert.ok(paths[0].rects.some(r=>r[0]===120&&r[1]===120&&r[2]===10));
 assert.equal(1-.55,.45,'remembered regions retain a substantial fog tint');
});
test('floor plan reveals briefing geometry without promoting it to live sight',()=>{
 const {ctx,calls}=recorder();
 paintFogMemory(ctx,session('floor-plan'));
 const paths=pathErases(calls);
 assert.equal(paths.length,2);
 assert.equal(paths[0].style,'rgba(255,255,255,0.4)');
 assert.equal(paths[1].style,'rgba(255,255,255,0.25)');
 assert.ok(Math.abs((1-.4)*(1-.25)-.45)<1e-9,
   'plan + remembered compositing matches normal exploration opacity');
});
test('Full View does not retain a fog tint in the 2D canvas',()=>{
 const {ctx,calls}=recorder();
 paintFogMemory(ctx,session('full-view'));
 assert.equal(pathErases(calls).length,0);
 assert.ok(calls.some(c=>c.kind==='rect'&&
   c.mode==='destination-out'&&c.rect[0]===0&&c.rect[1]===0&&
   c.rect[2]===640&&c.rect[3]===740));
});
test('exterior briefing clears accessible outside but re-covers exact rooms',()=>{
 const site={seed:7,bounds:{minX:0,minY:0,maxX:400,maxY:400},
  rooms:[{id:'R',x:100,y:100,w:120,h:160,kind:'room',tone:0}],
  windows:[]};
 assert.equal(exteriorBriefedAt(site,{x:60,y:60}),true);
 assert.equal(exteriorBriefedAt(site,{x:120,y:120}),false);
 const {ctx,calls}=recorder();
 paintFogMemory(ctx,{...session('exterior-known',site),seenGround:new Set()});
 assert.ok(calls.some(c=>c.kind==='rect'&&
   c.mode==='source-over'&&c.style===UNKNOWN_FOG_COLOR&&
   c.rect[0]===100&&c.rect[1]===100&&
   c.rect[2]===120&&c.rect[3]===160),
   'each indoor module is re-covered after exterior clearing');
 assert.equal(pathErases(calls).length,0,
   'briefed exterior cannot be mistaken for observed indoor memory');
});
test('an enclosed courtyard stays unknown while an open shipping court is outside',()=>{
 const room=(id,x,y,w,h)=>({id,x,y,w,h,kind:'room',tone:0});
 const border=[room('N',100,100,220,40),room('W',100,140,40,150),
   room('E',280,140,40,150)];
 const site={seed:22,rooms:border,
  bounds:{minX:0,minY:0,maxX:450,maxY:450}};
 assert.equal(exteriorBriefedAt(site,{x:210,y:210}),true);
 const enclosed={...site,rooms:[...border,room('S',100,290,220,40)]};
 assert.equal(exteriorBriefedAt(enclosed,{x:210,y:210}),false);
 const rects=exteriorKnownFogRects(enclosed);
 assert.ok(rects.some(r=>210>r.x&&210<r.x+r.w&&
   210>r.y&&210<r.y+r.h));
});
test('3D overlays unknown interior props instead of depth-revealing them',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(code,/map:this\.fogTexture,transparent:true,depthTest:false,opacity:1/);
 assert.match(code,/this\.smoothFog\.renderOrder=1000;/);
 assert.match(code,/this\.exteriorKnownFog\.renderOrder=1000;/);
 assert.match(code,/wall\.mesh\.renderOrder=translucent\?1001:0;/);
 assert.match(code,/exteriorKnownFogRects\(site\)/);
});
