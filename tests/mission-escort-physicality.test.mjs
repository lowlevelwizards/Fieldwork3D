import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceRescueEscort} from '../src/breach-rescue-escort.ts';

test('R1: civilian follows at finite speed, never snapping to escort',()=>{
 let s={p:{x:0,y:0},following:'rook',trail:[{x:0,y:0},{x:15,y:0}]};
 for(let i=0;i<10;i++)s=advanceRescueEscort(s,{x:18+i*1.6,y:0},1/30,()=>true);
 assert.ok(s.p.x>0&&s.p.x<22);
 assert.equal(s.following,'rook');
});
test('R1: blocked physical doorway stops the person until clear',()=>{
 let blocked=true;
 let s={p:{x:0,y:0},following:'rook',trail:[
  {x:0,y:0},{x:10,y:0},{x:20,y:0},{x:30,y:0}]};
 const canStep=(a,b)=>!blocked||b.x<12||a.x>=12;
 for(let i=0;i<80;i++)s=advanceRescueEscort(s,{x:35,y:0},1/30,canStep);
 assert.ok(s.p.x<=12);
 blocked=false;
 for(let i=0;i<80;i++)s=advanceRescueEscort(s,{x:35,y:0},1/30,canStep);
 assert.ok(s.p.x>12);
});
test('R1: separated escort drops custody without moving the person',()=>{
 const s={p:{x:0,y:0},following:'rook',trail:[{x:0,y:0}]};
 const result=advanceRescueEscort(s,{x:100,y:0},1/30,()=>true);
 assert.equal(result.following,null);
 assert.deepEqual(result.p,{x:0,y:0});
});
