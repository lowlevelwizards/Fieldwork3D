import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KnownRoutePreviewSampler} from '../src/ui/known-route-preview.ts';
const p=(x,y)=>({x,y});
test('R4.1 samples only at bounded preview cadence and never alters goals',()=>{
 let queries=0;
 const normal=(intel,from,to)=>{queries++;return [to];};
 const preview=new KnownRoutePreviewSampler(normal,()=>[],()=> 'known');
 const intel={},from=p(5,5),target=p(120,64);
 const first=preview.sample(from,target,intel,1000);
 assert.equal(first.kind,'normal');assert.equal(queries,1);
 for(let i=1;i<120;i++)preview.sample(from,p(120+i,64),intel,1000+i);
 assert.equal(queries,1,'120 render frames may not invoke 120 path searches');
 const later=preview.sample(from,p(128,65),intel,1190);
 assert.equal(later.kind,'normal');assert.equal(queries,2);
 assert.deepEqual(target,p(120,64),'never modify caller-authored point');
});
test('R4.1 narrow fallback is explicit; unreachable is not misrepresented',()=>{
 const preview=new KnownRoutePreviewSampler(()=>[],(_,from,to)=>
  to.x>50?[to]:[],()=> 'known');
 const intel={};
 assert.equal(preview.sample(p(0,0),p(70,0),intel,0).kind,'narrow');
 assert.equal(preview.sample(p(0,0),p(30,0),intel,190).kind,'unavailable');
 assert.equal(preview.sample(p(0,0),p(1,0),intel,390),null);
});
test('R4.1 draws only planning-intel preview with no physical world route',()=>{
 const source=readFileSync(new URL('../src/ui/breach-tactical-frame-feedback-controller.ts',import.meta.url),'utf8');
 assert.match(source,/routePreview\.sample\(finalPoint\(actor\),cursor!,state\.intel/);
 assert.match(source,/NO KNOWN ROUTE/);
 assert.match(source,/NARROW PASSAGE/);
 assert.match(source,/routePreview\.reset\(\)/);
});
