import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planLandscapeBedMarks} from '../src/worldgen/landscape-bed-surfaces.ts';
import {planServiceBoundaryMarks}
 from '../src/worldgen/service-boundary-marks.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {propertySurfaceCenterHeight}
 from '../src/rendering/property-surface-elevation.ts';
import {planRearServiceMarks} from '../src/worldgen/rear-service-program.ts';
import {generateSite} from '../src/breach-site.ts';

const room={id:'R',kind:'room',x:225,y:230,w:250,h:200};
const base={
 seed:18,name:'Test lot',archetype:'house',entrySide:'south',
 layout:'courtyard',roomCount:1,rooms:[room],
 walls:[],windows:[],doors:[{id:'FRONT',
 a:{x:330,y:430},b:{x:370,y:430}}],
 entrance:{x:350,y:430},bounds:{
 minX:0,minY:0,maxX:700,maxY:700},
 spawn:[],enemies:[],objective:{x:-99,y:-99},extract:{x:-99,y:-99}
};
const garden={id:'rear-property',kind:'garden',
 x:350,y:153,w:250,h:100};
const service={id:'rear-property',kind:'service',
 x:350,y:153,w:250,h:100};
const plant=(fixture,x,y,w=14,h=14)=>({fixture,x,y,w,h,low:false});
const markHits=(a,b,pad=0)=>
 Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&
 Math.abs(a.y-b.y)<(a.depth+b.depth)/2+pad;

test('planting beds require actual accepted vegetation, not invented strips',()=>{
 const empty={...base,exteriorZones:[garden],cover:[]};
 assert.deepEqual(planLandscapeBedMarks(empty),[]);
 const physical={...empty,cover:[
  plant('tree-broadleaf',274,122),
  plant('shrub-round',303,122,26,23),
  plant('shrub-tall',407,178,29,25),
  plant('shrub-round',437,180,26,23)
 ]};
 const marks=planLandscapeBedMarks(physical);
 assert.equal(marks.filter(x=>x.kind==='planting-bed').length,2);
 assert.equal(marks.filter(x=>x.kind==='planting-edge').length,2);
 assert.deepEqual(marks,planLandscapeBedMarks(physical));
 for(const m of marks){
  assert.ok(m.x-m.width/2>=garden.x-garden.w/2+2);
  assert.ok(m.x+m.width/2<=garden.x+garden.w/2-2);
  assert.ok(m.y-m.depth/2>=garden.y-garden.h/2+2);
  assert.ok(m.y+m.depth/2<=garden.y+garden.h/2-2);
 }
 const finishes=planPropertySurfaces(physical);
 assert.equal(finishes.filter(m=>m.kind==='planting-bed').length,2);
 assert.equal(finishes.filter(m=>m.kind==='garden-border').length,0);
 assert.equal(planPropertySurfaces(empty)
   .filter(m=>m.kind==='planting-bed').length,0);
});

test('planting beds do not cover entry footpaths or creep through rooms',()=>{
 const front={...garden,id:'arrival-forecourt',kind:'yard',
   x:350,y:480,w:250,h:96};
 const s={...base,exteriorZones:[front],
   cover:[plant('tree-broadleaf',350,479),
    plant('shrub-round',355,483,26,23)]};
 assert.deepEqual(planLandscapeBedMarks(s),[],
   'central pedestrian approach must stay clear');
});

test('service-bay outlines only follow existing placed work equipment',()=>{
 const empty={...base,archetype:'warehouse',
   exteriorZones:[service],cover:[]};
 assert.deepEqual(planServiceBoundaryMarks(empty),[]);
 const site={...empty,cover:[
  plant('screened-dumpster',286,132,56,36),
  plant('utility-cabinet',414,176,30,20),
  plant('pallet',300,171,40,23)
 ]};
 const lines=planServiceBoundaryMarks(site);
 assert.ok(lines.length>=3&&lines.length<=9);
 assert.ok(lines.some(m=>m.kind==='waste-bay-line'));
 assert.ok(lines.some(m=>m.kind==='utility-bay-line'));
 assert.ok(lines.some(m=>m.kind==='loading-bay-line'));
 const lane=planRearServiceMarks([service])
   .find(m=>m.kind==='clear-route');
 assert.ok(lane);
 assert.ok(lines.every(line=>!markHits(line,lane)),
  'paint must not visually invade protected service route');
 assert.deepEqual(lines,planServiceBoundaryMarks(site),
  'no playback-time randomness');
 assert.deepEqual(site.cover[0],plant('screened-dumpster',286,132,56,36),
  'pure surface planner does not mutate physical prop');
});

test('ground details are visually distinct, with controlled depth hierarchy',()=>{
 assert.ok(propertySurfaceCenterHeight('planting-bed')<
   propertySurfaceCenterHeight('planting-edge'));
 assert.ok(propertySurfaceCenterHeight('planting-edge')<
   propertySurfaceCenterHeight('utility-bay-line'));
 const scene=readFileSync(new URL('../src/rendering/breach-site-exterior-builder.ts',import.meta.url),'utf8');
 const surfacePolicy=readFileSync(new URL('../src/rendering/breach-site-surface-policy.ts',import.meta.url),'utf8');
 for(const kind of ['planting-bed','planting-edge','waste-bay-line',
    'utility-bay-line','loading-bay-line'])
  assert.ok((scene+surfacePolicy).includes("'"+kind+"'"),kind);
 assert.match(scene,/mark.kind==='planting-bed'\?'packed-earth'/);
 assert.match(scene,/mark.kind==='planting-edge'\?'gravel'/);
 const src=readFileSync(new URL('../src/worldgen/property-surfaces.ts',
   import.meta.url),'utf8');
 assert.match(src,/planLandscapeBedMarks\(site\)/);
 assert.match(src,/planServiceBoundaryMarks\(site\)/);
 assert.doesNotMatch(src,/zone\.kind==='garden'\)\{\s*const edge=/);
});

test('parking and wayfinding signs have distinct icons, not a yellow bar',()=>{
 const src=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',
  import.meta.url),'utf8');
 assert.match(src,/fixture==='wayfinding-sign'/);
 assert.match(src,/pedestrian-door pictogram/);
 assert.match(src,/fixture==='parking-sign'/);
 assert.match(src,/parking 'P' on an enamel-blue/);
 assert.doesNotMatch(src,/ctx.box\(group,c.x,height\*\.79,c.y\+\.9,w\*\.55,1\.8,\.7,safety,false\)/);
});

test('seeded mission geometry remains stable without reintroducing vehicles',()=>{
 const forbidden=new Set(['vehicle','sedan','pickup','van','suv']);
 for(let seed=1;seed<=16;seed++){
  const site=generateSite(seed);
  const previous=generateSite(seed);
  assert.deepEqual(site.cover,previous.cover,'seed '+seed);
  assert.ok(site.cover.every(c=>!forbidden.has(c.fixture??'')));
  const a=planPropertySurfaces(site),b=planPropertySurfaces(previous);
  assert.deepEqual(a,b,'surface determinism '+seed);
  assert.ok(a.filter(m=>m.kind==='planting-bed').length<=4);
  assert.ok(a.filter(m=>m.kind.endsWith('-bay-line')).length<=36);
 }
});
