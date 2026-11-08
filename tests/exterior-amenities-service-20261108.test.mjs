import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {outdoorFixtureAllowed,frontageEdgeCandidates}
  from '../src/worldgen/outdoor-fixture-policy.ts';
import {planServiceDockBumpers}
  from '../src/worldgen/service-facade-program.ts';
import {planRearServiceMarks}
  from '../src/worldgen/rear-service-program.ts';
import {serviceYardEdgeCandidates}
  from '../src/worldgen/service-yard-layout.ts';
import {overlapsPublicStreetRoad}
  from '../src/worldgen/public-street-layout.ts';

const sides=['north','south','east','west'];
function lot(side='south',archetype='retail'){
 const horizontal=side==='north'||side==='south';
 const entrance=side==='north'?{x:350,y:230}:
  side==='south'?{x:350,y:430}:
  side==='east'?{x:475,y:330}:{x:225,y:330};
 const back=side==='north'?{x:350,y:430}:
  side==='south'?{x:350,y:230}:
  side==='east'?{x:225,y:330}:{x:475,y:330};
 const line=(id,p)=>({id,a:horizontal?
  {x:p.x-25,y:p.y}:{x:p.x,y:p.y-25},
  b:horizontal?{x:p.x+25,y:p.y}:{x:p.x,y:p.y+25}});
 return {seed:18,archetype,entrySide:side,
  rooms:[{id:'BUILDING',kind:'room',purpose:'lobby',
    x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},
  doors:[line('FRONT',entrance),line('SERVICE',back)],
  entrance,cover:[],spawn:[],enemies:[],
  objective:{x:-99,y:-99},extract:{x:-99,y:-99}};
}
test('new commercial props are not electrical cabinets or generic vehicle models',()=>{
 for(const [id,dimensions] of [
   ['vending-machine',[29,24,44]],
   ['wayfinding-sign',[18,10,48]],
   ['screened-dumpster',[56,36,38]]
 ]){
  const asset=propDefinition(id);
  assert.ok(asset,id);
  assert.deepEqual([asset.width,asset.depth,asset.height],dimensions);
  assert.equal(asset.solid,true);
  assert.equal(assetLibrary().find(a=>a.id===id)?.presentation,'bespoke');
 }
 const visual=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
 assert.match(visual,/fixture==='vending-machine'/);
 assert.match(visual,/fixture==='wayfinding-sign'/);
 assert.match(visual,/fixture==='screened-dumpster'/);
 assert.match(visual,/fixture==='street-lamp'/);
 assert.match(visual,/fixture==='hydrant'/);
 assert.match(visual,/coin\/payment reader/);
 assert.match(visual,/No extra real-time light sources/);
 assert.doesNotMatch(visual,/const glass=visualCtx.solid\(0x45636a,.35,'glass'\)/);
});

test('commercial/vending and municipal hardware obey site eligibility',()=>{
 const parking={id:'arrival-forecourt',kind:'parking',
   x:350,y:490,w:222,h:118};
 const rear={...parking,id:'rear-property',kind:'service'};
 assert.equal(outdoorFixtureAllowed({archetype:'retail'},parking,'vending-machine'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'motel'},parking,'vending-machine'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},parking,'vending-machine'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'clinic'},parking,'vending-machine'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},parking,'wayfinding-sign'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'clinic'},parking,'wayfinding-sign'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},rear,'screened-dumpster'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},parking,'screened-dumpster'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},rear,'hydrant'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},parking,'hydrant'),true);
});

test('vending kiosk fits and faces commercial front on all four facades',()=>{
 for(const side of sides){
  const site=addExteriorProperty(lot(side),18);
  const zone=site.exteriorZones.find(z=>z.id==='arrival-forecourt');
  assert.ok(zone);
  const turned=side==='east'||side==='west';
  const w=turned?24:29,h=turned?29:24;
  const places=frontageEdgeCandidates(site,zone,'vending-machine',w,h);
  assert.equal(places?.length,2,side);
  for(const p of places){
   assert.ok(p.x-w/2>=zone.x-zone.w/2-1,side+' inside x');
   assert.ok(p.x+w/2<=zone.x+zone.w/2+1,side+' inside x max');
   assert.ok(p.y-h/2>=zone.y-zone.h/2-1,side+' inside y');
   assert.ok(p.y+h/2<=zone.y+zone.h/2+1,side+' inside y max');
   assert.equal(overlapsPublicStreetRoad(site,{...p,w,h}),false,side);
   assert.ok(Math.hypot(p.x-site.entrance.x,
     p.y-site.entrance.y)>68,side+' doorway clearance');
  }
 }
});

test('industrial work pads attach to rear facade; bumpers require real service doors',()=>{
 for(const side of sides){
  const s=addExteriorProperty(lot(side,'warehouse'),12);
  const zone=s.exteriorZones.find(z=>z.id==='rear-property');
  assert.ok(zone&&zone.kind==='service',side);
  const guards=planServiceDockBumpers(s);
  assert.equal(guards.length,1,side);
  assert.equal(guards[0].span,50);
  const noService={...s,doors:s.doors.filter(d=>d.id==='FRONT')};
  assert.equal(planServiceDockBumpers(noService).length,0);
  assert.equal(planServiceDockBumpers({...s,archetype:'house'}).length,0);
 }
});

test('screened refuse enclosure is sorted toward the waste pad',()=>{
 const zone={id:'rear-property',kind:'service',
  x:240,y:280,w:250,h:110};
 const mark=planRearServiceMarks([zone]).find(m=>m.kind==='waste-collection');
 assert.ok(mark);
 const points=serviceYardEdgeCandidates(zone,56,36,'screened-dumpster');
 assert.ok(points.length>=2);
 const d=p=>Math.hypot(p.x-mark.x,p.y-mark.y);
 assert.ok(points.every(p=>d(points[0])<=d(p)));
});

test('seeded maps generate meaningful frontage hardware without retired cars',()=>{
 const forbidden=new Set(['vehicle','sedan','pickup','van','suv']);
 const tally={vending:0,sign:0,screen:0,lamp:0,hydrant:0};
 for(let seed=1;seed<=64;seed++)for(const side of sides){
   const s=addExteriorProperty(lot(side,'retail'),seed);
   for(const c of s.cover){
     assert.ok(!forbidden.has(c.fixture??''),'retired car');
     if(c.fixture==='vending-machine')tally.vending++;
     if(c.fixture==='wayfinding-sign')tally.sign++;
     if(c.fixture==='street-lamp')tally.lamp++;
     if(c.fixture==='hydrant')tally.hydrant++;
   }
   const industrial=addExteriorProperty(lot(side,'warehouse'),seed);
   tally.screen+=industrial.cover.filter(c=>
     c.fixture==='screened-dumpster').length;
 }
 for(const [name,value] of Object.entries(tally))
   assert.ok(value>0, name+' never appears in generated outdoors');
});
