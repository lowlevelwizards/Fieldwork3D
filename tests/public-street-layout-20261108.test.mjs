import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {planPublicStreet,overlapsPublicStreetRoad}
  from '../src/worldgen/public-street-layout.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';

function lot(entrySide,archetype='house'){
 const rooms=[{id:'R',x:225,y:230,w:250,h:200,kind:'room',
  purpose:'living'}];
 const entrance=entrySide==='north'?{x:350,y:230}:
   entrySide==='south'?{x:350,y:430}:
   entrySide==='east'?{x:475,y:330}:{x:225,y:330};
 const parallel=entrySide==='north'||entrySide==='south';
 return {seed:11,entrySide,archetype,rooms,cover:[],
   doors:[{id:'FRONT',a:parallel?
     {x:entrance.x-24,y:entrance.y}:{x:entrance.x,y:entrance.y-24},
     b:parallel?{x:entrance.x+24,y:entrance.y}:
       {x:entrance.x,y:entrance.y+24}}],
   entrance,bounds:{minX:0,minY:0,maxX:700,maxY:700},
   spawn:[],enemies:[],objective:{x:-100,y:-100},
   extract:{x:-100,y:-100}};
}
const intersects=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2&&
 Math.abs(a.y-b.y)<(a.depth+b.depth)/2;

test('carriageway follows public boundary, perpendicular to door approach in all directions',()=>{
 for(const side of ['north','south','east','west']){
  const site=addExteriorProperty(lot(side),11),s=planPublicStreet(site);
  assert.ok(s,side);
  assert.ok(s.sidewalk,side);
  assert.ok(s.approach,side);
  assert.equal(s.curb.length,1,'domestic frontage keeps continuous curb '+side);
  const northSouth=side==='north'||side==='south';
  assert.equal(s.road.width>s.road.depth,northSouth);
  assert.equal(s.approach.width<s.approach.depth,northSouth);
  assert.equal(intersects(s.road,s.approach),false,'no road across door path '+side);
  const center=northSouth?s.road.y:s.road.x;
  assert.ok(side==='south'||side==='east'?center>350:center<350);
  const marks=planPropertySurfaces(site);
  assert.equal(marks.filter(m=>m.kind==='sidewalk').length,1);
  assert.equal(marks.filter(m=>m.kind==='curb-edge').length,1);
  assert.equal(marks.filter(m=>m.kind==='crosswalk-stripe').length,0);
  assert.ok(marks.some(m=>m.kind==='path'&&m.zoneId==='arrival-forecourt'));
  assert.equal(overlapsPublicStreetRoad(site,{
   x:s.road.x,y:s.road.y,w:8,h:8}),true);
  assert.equal(overlapsPublicStreetRoad(site,{
   x:site.entrance.x,y:site.entrance.y,w:8,h:8}),false);
 }
});

test('parking frontage has one curb cut but no invented zebra crossing',()=>{
 for(const side of ['south','east']){
  const s=addExteriorProperty(lot(side,'clinic'),23);
  const layout=planPublicStreet(s);
  assert.ok(layout);
  assert.ok(layout.curbRamp);
  assert.equal(layout.curb.length,2);
  const marks=planPropertySurfaces(s);
  assert.equal(marks.filter(x=>x.kind==='curb-ramp').length,1);
  assert.equal(marks.filter(x=>x.kind==='crosswalk-stripe').length,0);
 }
});

test('tight lots do not pretend to have a full roadway over the building',()=>{
 const s=lot('south');
 s.bounds.maxY=450;
 assert.equal(planPublicStreet(s),null);
 // Partial-input asset preview sites can still request parking markings.
 assert.equal(planPublicStreet({entrySide:'south',entrance:s.entrance}),null);
});

test('real generated outdoor props stay out of the street, not just utilities',()=>{
 for(let seed=1;seed<=24;seed++){
  const s=generateSite(seed);
  const street=planPublicStreet(s);
  if(!street)continue;
  for(const item of s.cover){
   const outside=!s.rooms.some(room=>item.x>room.x&&item.x<room.x+room.w&&
     item.y>room.y&&item.y<room.y+room.h);
   if(outside&&item.fixture&&item.fixture!=='window-sill'&&
     item.fixture!=='glass-barrier')
     assert.equal(overlapsPublicStreetRoad(s,item),false,
       'seed '+seed+' fixture '+item.fixture+' blocks road');
  }
 }
});

test('3D renderer shares roadway geometry and never paints a drive from the door',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(source,/const street=planPublicStreet\(site\)/);
 assert.match(source,/street\.road\.width,\.24,street\.road\.depth/);
 assert.doesNotMatch(source,/Math\.abs\(site\.entrance\.x-edge\)\+10/);
 assert.doesNotMatch(source,/Math\.abs\(site\.entrance\.y-edge\)\+10/);
});
