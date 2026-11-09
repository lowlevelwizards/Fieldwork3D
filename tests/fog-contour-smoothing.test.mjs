import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {traceFogCellContours,appendSmoothFogContours}
  from '../src/breach-fog-contours.ts';
import {paintFogMemory,paintFogVisibility,UNKNOWN_FOG_COLOR}
  from '../src/breach-fog-mask.ts';

const cell=(col,row)=>({col,row});
function recordCanvas(){
 const calls=[];
 const ctx={
  canvas:{width:320,height:370},fillStyle:'',filter:'none',
  globalCompositeOperation:'source-over',
  save(){calls.push('save');},restore(){calls.push('restore');},
  setTransform(){},clearRect(){},
  fillRect(x,y,w,h){calls.push(['field',this.globalCompositeOperation,
    this.fillStyle,x,y,w,h]);},
  beginPath(){calls.push('begin');},
  rect(...values){calls.push(['rect',...values]);},
  clip(){calls.push('clip');},
  moveTo(x,y){calls.push(['move',x,y]);},
  lineTo(x,y){calls.push(['line',x,y]);},
  quadraticCurveTo(...values){calls.push(['curve',...values]);},
  closePath(){calls.push('close');},
  fill(rule){calls.push(['fill',this.globalCompositeOperation,this.filter,rule]);},
 };
 return {ctx,calls};
}

test('marching-square walk preserves separate diagonal discoveries',()=>{
 const contours=traceFogCellContours([cell(2,2),cell(3,3)]);
 assert.equal(contours.length,2,
   'diagonal corners must never bridge unobserved squares');
 assert.ok(contours.every(c=>c.length===4));
 assert.deepEqual(contours[0].map(p=>[p.x,p.y]),[
   [2,2],[3,2],[3,3],[2,3]
 ]);
});

test('marching contours preserve a hole and ignore duplicate micro/fine cells',()=>{
 const square=[];
 for(let y=0;y<3;y++)for(let x=0;x<3;x++)
  if(x!==1||y!==1)square.push(cell(x,y));
 const contours=traceFogCellContours([...square,cell(0,0),cell(0,0)]);
 assert.equal(contours.length,2,'unseen interior remains a separate ring');
 const unique=traceFogCellContours([cell(1,1),cell(1,1)]);
 assert.equal(unique.length,1);
 assert.equal(unique[0].length,4);
});

test('rounded vector paths use quadratic corners without inserting fog cells',()=>{
 const contours=traceFogCellContours([cell(-1,2),cell(0,2)]);
 const {ctx,calls}=recordCanvas();
 appendSmoothFogContours(ctx,contours,10);
 assert.ok(calls.filter(c=>Array.isArray(c)&&c[0]==='curve').length>=4);
 assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='move'&&c[1]<0));
 assert.ok(calls.includes('close'));
});

test('memory smoothing clips to ORIGINAL explored rectangles before erasure',()=>{
 const {ctx,calls}=recordCanvas();
 const state={
  site:undefined,doors:[],operators:[],
  seenGround:new Set(['micro:2,2','micro:3,2','micro:3,3']),
  intel:{mode:'true-blind',rooms:new Set(),walls:new Set(),
    doors:new Set(),cover:new Set()}
 };
 paintFogMemory(ctx,state);
 const clip=calls.indexOf('clip');
 const curve=calls.findIndex(c=>Array.isArray(c)&&c[0]==='curve');
 const erased=calls.findIndex(c=>Array.isArray(c)&&c[0]==='fill'&&
   c[1]==='destination-out');
 assert.ok(clip>0&&curve>clip&&erased>curve,
   'render only the smoothed contour INSIDE unchanged seen cells');
 assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='rect'&&
   c[1]===20&&c[2]===20&&c[3]===10&&c[4]===10));
 assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='field'&&
   c[2]===UNKNOWN_FOG_COLOR),'unknown remains fully covered');
 assert.equal(ctx.filter,'none','no Gaussian feather into unseen areas');
 assert.equal(calls[erased][3],'evenodd','preserve unknown interior holes');
});

test('live sight stays a separate sharp vector pass',()=>{
 const {ctx,calls}=recordCanvas();
 paintFogVisibility(ctx,{site:undefined,doors:[],operators:[]});
 assert.ok(!calls.includes('clip'),
   'sight must never inherit memory contour clipping');
 assert.equal(ctx.filter,'none','no blur through occluding walls');
 const source=readFileSync(
   new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
 assert.match(source,/visionPolygon\(/);
 assert.doesNotMatch(source,/ctx\.filter='blur\(2px\)'/);
});
