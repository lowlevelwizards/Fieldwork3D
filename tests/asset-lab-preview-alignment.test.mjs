import test from 'node:test';
import assert from 'node:assert/strict';
import {showroomGrid,showroomSlot} from '../src/asset-lab-layout.ts';
import {synchronizeShowroomSession} from '../src/asset-lab-preview.ts';
import {readFileSync} from 'node:fs';
test('asset grid slots stay distinct on small and large viewports',()=>{
 for(const width of [390,650,768,1200]){
   const grid=showroomGrid(width),points=Array.from(
     {length:grid.pageSize},(_,i)=>showroomSlot(i,grid));
   assert.equal(new Set(points.map(p=>p.x+','+p.y)).size,grid.pageSize);
   for(const p of points){
     assert.ok(p.x>0&&p.x<grid.width);
     assert.ok(p.y>0&&p.y<grid.height);
   }
 }
 assert.equal(showroomGrid(390).columns,2);
 assert.equal(showroomGrid(390).pageSize,4);
 assert.equal(showroomGrid(1200).pageSize,12);
});
test('asset preview session does not reapply stale battle cover transforms',()=>{
 const old={fixture:'sofa',x:100,y:120,w:20,h:12};
 const seat={fixture:'sedan',x:270,y:260,w:64,h:32};
 const site={cover:[seat],doors:[],windows:[]};
 const session={site:{cover:[old]},coverState:[old],doors:[],windows:[]};
 synchronizeShowroomSession(session,site);
 assert.deepEqual(session.coverState,[seat]);
 assert.notStrictEqual(session.coverState[0],seat);
 assert.strictEqual(session.site,site);
 const code=readFileSync(new URL('../src/asset-lab-main.ts',import.meta.url),'utf8');
 assert.match(code,/synchronizeShowroomSession\(session,site\)/);
 assert.match(code,/showroomSlot\(index,layout\)/);
 assert.match(code,/const at=stage\.project\(marker\.p,0\)/);
 assert.ok(code.includes('stage.canvas.getBoundingClientRect()'));
});
