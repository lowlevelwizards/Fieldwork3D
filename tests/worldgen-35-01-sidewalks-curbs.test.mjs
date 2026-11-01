import test from 'node:test';
import assert from 'node:assert/strict';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
const directions=['south','east','north','west'];
test('actual front-door approaches provide street-aligned sidewalk and kerb ramp on every facade',()=>{
 for(const side of directions){
  const vertical=side==='south'||side==='north';
  const zone={id:'arrival-forecourt',kind:'parking',
   x:vertical?220:320,y:vertical?320:220,
   w:vertical?250:100,h:vertical?100:250};
  const door=vertical?
   {a:{x:174,y:side==='south'?270:370},b:{x:222,y:side==='south'?270:370}}:
   {a:{x:side==='east'?270:370,y:174},b:{x:side==='east'?270:370,y:222}};
  const site={entrySide:side,doors:[{id:'FRONT',...door}],
   exteriorZones:[zone],entrance:{x:198,y:198}};
  const m=planPropertySurfaces(site),kinds=m.map(x=>x.kind);
  for(const kind of ['sidewalk','curb-edge','curb-ramp','crosswalk-stripe'])
   assert.ok(kinds.includes(kind),side+' missing '+kind);
  for(const x of m){
   assert.ok(x.x-x.width/2>=zone.x-zone.w/2-1,side+':'+x.kind);
   assert.ok(x.y-x.depth/2>=zone.y-zone.h/2-1,side+':'+x.kind);
   assert.ok(x.x+x.width/2<=zone.x+zone.w/2+1,side+':'+x.kind);
   assert.ok(x.y+x.depth/2<=zone.y+zone.h/2+1,side+':'+x.kind);
  }
  assert.deepEqual(m,planPropertySurfaces(site));
 }
});
test('landscaped arrival has sidewalks but never painted parking stripes',()=>{
 const zone={id:'arrival-forecourt',kind:'yard',x:200,y:240,w:230,h:80};
 const site={entrySide:'south',
  doors:[{id:'FRONT',a:{x:116,y:200},b:{x:164,y:200}}],
  exteriorZones:[zone],entrance:{x:140,y:240}};
 const m=planPropertySurfaces(site);
 assert.ok(m.some(x=>x.kind==='sidewalk'));
 assert.ok(!m.some(x=>x.kind==='crosswalk-stripe'));
 assert.equal(m.find(x=>x.kind==='curb-ramp').x,140);
});
