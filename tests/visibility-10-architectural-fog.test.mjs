import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {architecturalOpeningKnown} from '../src/breach-presentation.ts';
import {maskSize,MAX_FOG_TEXTURE_EDGE} from '../src/breach-fog-mask.ts';
const room={id:'A',x:0,y:0,w:100,h:100,kind:'room',tone:0};
const inside={id:'serving',kind:'serving',
  a:{x:50,y:20},b:{x:50,y:40}};
const frontage={id:'arch',kind:'arch',
  a:{x:0,y:20},b:{x:0,y:40}};
function session(mode='exterior-known'){
 return {site:{rooms:[room]},seenGround:new Set(),operators:[],doors:[],
  intel:{mode,walls:new Set(),doors:new Set(),cover:new Set(),
    rooms:new Set(),doorMemory:new Map()}};
}
test('interior arches and serving windows remain hidden until seen',()=>{
 const s=session();
 assert.equal(architecturalOpeningKnown(s,inside),false);
 s.seenGround.add('micro:4,3');
 assert.equal(architecturalOpeningKnown(s,inside),true);
});
test('intel modes only reveal legitimately briefed exterior openings',()=>{
 const blind=session('true-blind');
 assert.equal(architecturalOpeningKnown(blind,frontage),false);
 const exterior=session();
 assert.equal(architecturalOpeningKnown(exterior,frontage),true);
 assert.equal(architecturalOpeningKnown(exterior,inside),false);
 assert.equal(architecturalOpeningKnown(session('floor-plan'),inside),true);
 assert.equal(architecturalOpeningKnown(session('full-view'),inside),true);
});
test('rendered architectural opening groups are explicitly gated',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const builder=readFileSync(new URL(
   '../src/rendering/breach-site-openings-builder.ts',import.meta.url),'utf8');
 assert.match(builder,/host\.registerArch\(opening,group\)/);
 assert.match(code,/opening\.obj\.visible=presentArchitecturalOpening/);
 const policy=readFileSync(new URL(
   '../src/rendering/breach-3d-disclosure-presenter.ts',import.meta.url),'utf8');
 assert.match(policy,/export function presentArchitecturalOpening/);
 assert.match(policy,/architecturalOpeningKnown\(s,opening,omniscient\)/);
});
test('fog texture is supersampled but capped for mobile',()=>{
 assert.deepEqual(maskSize({bounds:{minX:0,minY:0,maxX:640,maxY:740}}),{width:640,height:740});
 const large=maskSize({bounds:{minX:0,minY:0,maxX:3000,maxY:1800}});
 assert.ok(large.width<=MAX_FOG_TEXTURE_EDGE);
 assert.ok(large.height<=MAX_FOG_TEXTURE_EDGE);
});
test('remembered fog cells smooth within exact exploration boundaries without disclosure leaks',()=>{
 const code=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
 assert.match(code,/ctx\.rect\(p\.x,p\.y,20,20\)/);
 assert.match(code,/forEachRememberedMicroCell\(s\.seenGround,bounds/);
 assert.match(code,/appendSmoothFogContours\(ctx,contours\)/);
 assert.match(code,/ctx\.clip\(\)/);
 assert.match(code,/if\(!smoothed\)\{/);
 assert.match(code,/if\(polygonCount\)ctx\.fill\(\)/);
 assert.doesNotMatch(code,/ctx\.filter='blur\(1\.5px\)'/);
});
