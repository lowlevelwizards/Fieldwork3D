import test from 'node:test';
import assert from 'node:assert/strict';
import {addEntryTransition} from '../src/worldgen/entry-transition.ts';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('foyers and vestibules project a genuinely separate physical entry room',()=>{
 const b={kind:'retail',family:'test shop',widths:[180,140],
  depths:[130,140],front:{col:0,row:1},
  cells:[['stockroom','office'],['sales','checkout']]};
 const out=addEntryTransition(b,5);
 assert.notEqual(out,b);assert.equal(out.cells.length,3);
 assert.equal(out.widths.length,3);assert.equal(out.front.row,2);
 assert.equal(out.cells[2][out.front.col],'vestibule');
 assert.equal(out.widths.reduce((a,x)=>a+x,0),320);
 assert.deepEqual(blueprintIssues(out),[]);
 assert.equal(addEntryTransition(b,4),b,'nonselected seeds keep established layout');
});
test('selected real sites have connected door-cut entrance rooms, not an entry decal',()=>{
 let found=0;
 for(let seed=1;seed<=76;seed+=4){
  const site=compileArchitecturalSite('retail',seed,'medium');
  const entry=site.rooms.find(r=>r.purpose==='vestibule');
  if(!entry)continue;found++;
  const front=site.doors.find(d=>d.id==='FRONT');
  assert.ok(front);
  const p={x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2};
  assert.ok(p.x>=entry.x&&p.x<=entry.x+entry.w);
  assert.ok(p.y>=entry.y&&p.y<=entry.y+entry.h+1);
  assert.ok(site.doors.some(d=>d.id.startsWith('D')&&
    Math.hypot((d.a.x+d.b.x)/2-(entry.x+entry.w/2),
      (d.a.y+d.b.y)/2-(entry.y+entry.h/2))<95),
    'entry must have a real inner threshold');
 }
 assert.ok(found>0,'at least one medium shop should have an entrance projection');
});
