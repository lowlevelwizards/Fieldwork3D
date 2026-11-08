import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {planRearServiceMarks} from '../src/worldgen/rear-service-program.ts';
import {serviceYardEdgeCandidates}
 from '../src/worldgen/service-yard-layout.ts';
import {SERVICED_FACING_FIXTURES,intersectsServiceAccess,
 serviceEnvelope,serviceFacingOrientation}
 from '../src/worldgen/service-clear-route.ts';
import {landscapeEdgeCandidates}
 from '../src/worldgen/landscape-edge-program.ts';
import {overlapsPublicStreetRoad}
 from '../src/worldgen/public-street-layout.ts';

function lot(side='south',archetype='warehouse'){
 const horizontal=side==='north'||side==='south';
 const entrance=side==='north'?{x:350,y:230}:
   side==='south'?{x:350,y:430}:
   side==='east'?{x:475,y:330}:{x:225,y:330};
 const back=side==='north'?{x:350,y:430}:
   side==='south'?{x:350,y:230}:
   side==='east'?{x:225,y:330}:{x:475,y:330};
 const door=(id,p)=>({id,
  a:horizontal?{x:p.x-24,y:p.y}:{x:p.x,y:p.y-24},
  b:horizontal?{x:p.x+24,y:p.y}:{x:p.x,y:p.y+24}});
 return {seed:14,archetype,entrySide:side,
  rooms:[{id:'B',kind:'room',purpose:'loading',x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},cover:[],
  doors:[door('FRONT',entrance),door('SERVICE',back)],
  entrance,spawn:[],enemies:[],objective:{x:-99,y:-99},extract:{x:-99,y:-99}};
}

test('service work route runs outward through the SHORT yard dimension',()=>{
 for(const zone of [
  {id:'rear-property',kind:'service',x:250,y:280,w:260,h:80},
  {id:'rear-property',kind:'service',x:250,y:280,w:80,h:260}
 ]){
  const clear=planRearServiceMarks([zone]).find(m=>m.kind==='clear-route');
  assert.ok(clear);
  assert.ok(zone.w>zone.h?
    clear.width<clear.depth:clear.depth<clear.width);
  assert.ok(intersectsServiceAccess(zone,
    {x:clear.x,y:clear.y,w:12,h:12}));
  const outer=serviceYardEdgeCandidates(zone,56,36,'screened-dumpster')
    .filter(p=>!intersectsServiceAccess(zone,{
     ...p,...serviceEnvelope(zone,'screened-dumpster',56,36)}));
  assert.ok(outer.length>=2,'large work fixtures still have legal positions');
 }
});

test('service equipment faces shared lane on all four service edges',()=>{
 const broad={id:'rear-property',kind:'service',x:250,y:280,w:260,h:80};
 const long={...broad,w:80,h:260};
 assert.equal(serviceFacingOrientation(broad,{x:220,y:245}),0);
 assert.equal(serviceFacingOrientation(broad,{x:220,y:315}),2);
 assert.equal(serviceFacingOrientation(long,{x:215,y:280}),1);
 assert.equal(serviceFacingOrientation(long,{x:285,y:280}),3);
 assert.deepEqual(serviceEnvelope(long,'utility-cabinet',32,22),{w:22,h:32});
 assert.deepEqual(serviceEnvelope(broad,'utility-cabinet',32,22),{w:32,h:22});
 assert.deepEqual(serviceEnvelope(long,'crate',30,20),{w:30,h:20});
});

test('four-sided real seeded rear yards keep reserved access and road clear',()=>{
 const sides=['south','north','east','west'];
 let equipped=0,screened=0;
 for(const side of sides)for(let seed=1;seed<=24;seed++){
  const site=addExteriorProperty(lot(side),seed);
  const rear=site.exteriorZones.find(z=>z.id==='rear-property');
  assert.ok(rear&&rear.kind==='service',side);
  for(const c of site.cover){
   if(c.x<rear.x-rear.w/2||c.x>rear.x+rear.w/2||
      c.y<rear.y-rear.h/2||c.y>rear.y+rear.h/2)continue;
   assert.equal(intersectsServiceAccess(rear,c),false,
     side+' seed '+seed+' '+c.fixture+' blocked service access');
   assert.equal(overlapsPublicStreetRoad(site,c),false);
   if(SERVICED_FACING_FIXTURES.has(c.fixture??'')){
    assert.equal(c.orientation,serviceFacingOrientation(rear,c),
      side+' service fixture faces away from work lane');
    equipped++;
    if(c.fixture==='screened-dumpster')screened++;
   }
  }
  assert.ok(site.cover.every(c=>
   !['vehicle','sedan','pickup','van','suv'].includes(c.fixture??'')));
 }
 assert.ok(equipped>0,'service fixtures must not disappear');
 assert.ok(screened>0,'screened refuse must remain possible');
});

test('planted site edges follow small deterministic groups, not random parking trees',()=>{
 const base={id:'rear-property',kind:'garden',x:250,y:290,w:280,h:95};
 const garden=landscapeEdgeCandidates(base,17);
 assert.ok(garden.length>=4&&garden.length<=6);
 assert.deepEqual(garden,landscapeEdgeCandidates(base,17));
 const yard=landscapeEdgeCandidates({...base,kind:'yard'},17);
 assert.ok(yard.length>=3&&yard.length<=5);
 for(const family of [garden,yard]){
  assert.ok(family.every(c=>!['vehicle','sedan','pickup','van','suv']
    .includes(c.fixture)));
  assert.ok(family.some(c=>c.fixture.startsWith('shrub')));
  for(let i=0;i+1<family.length;i+=2){
   assert.ok((family[i].y-base.y)*(family[i+1].y-base.y)>=0,
     'pair has a coherent planted edge');
  }
 }
 const parking=landscapeEdgeCandidates({...base,kind:'parking'},17);
 assert.ok(parking.every(c=>c.fixture==='planter'));
 assert.deepEqual(landscapeEdgeCandidates({...base,kind:'service'},17),[]);
});

test('all exterior planters use pooled alpha-cutout cards, never heavy lobes',()=>{
 const art=readFileSync(new URL('../src/worldgen/asset-character-visuals.ts',
   import.meta.url),'utf8');
 const foliage=readFileSync(new URL('../src/worldgen/foliage-card-visuals.ts',
   import.meta.url),'utf8');
 const block=art.split("}else if(fixture==='planter'){")[1]?.split('}else{')[0]??'';
 assert.ok(block.includes('renderPlanterFoliageCards(group,c,index)'));
 assert.doesNotMatch(block,/IcosahedronGeometry/);
 assert.match(foliage,/export function renderPlanterFoliageCards/);
 assert.match(foliage,/crown\(group,'shrub'/);
 assert.match(foliage,/crown\(group,'scrub'/);
 assert.match(foliage,/mesh\.castShadow=false/);
});

test('site generation remains deterministic with real new landscaping',()=>{
 for(let seed=1;seed<=22;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover);
 }
});
