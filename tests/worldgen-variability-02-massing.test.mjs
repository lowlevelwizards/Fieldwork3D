import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('all eleven medium building archetypes have four independent functional programs',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const plans=[0,4,7,3].map(seed=>architecturalBlueprint(kind,seed));
  assert.equal(new Set(plans.map(p=>p.family.replace(' / mirrored',''))).size,4,
   kind+' still only has cloned hall templates');
  for(const p of plans)assert.deepEqual(blueprintIssues(p),[],kind+' '+p.family);
 }
});
test('the restaurant variant offers a restroom beside the public dining room',()=>{
 const p=architecturalBlueprint('restaurant',3),g=p.cells;
 assert.ok(p.family.includes('courtyard restaurant'));
 let adjacent=false;
 for(let y=0;y<g.length;y++)for(let x=0;x<g[y].length;x++){
  if(g[y][x]!=='restroom')continue;
  adjacent=['dining'].some(role=>
   [[1,0],[-1,0],[0,1],[0,-1]].some(([dy,dx])=>g[y+dy]?.[x+dx]===role));
 }
 assert.ok(adjacent,'restroom should not require going through the service area');
});
test('a new independent notched building compiles actual walls and entrance',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const s=compileArchitecturalSite(kind,3,'medium');
  assert.ok(s.doors.some(d=>d.id==='FRONT'),kind);
  assert.ok(s.walls.length>0,kind);
  assert.ok(s.rooms.length>=8,kind);
 }
});
