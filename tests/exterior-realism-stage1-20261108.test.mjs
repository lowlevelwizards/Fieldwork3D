import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {outdoorFixtureAllowed,frontageEdgeCandidates}
  from '../src/worldgen/outdoor-fixture-policy.ts';
import {landscapePhysicalFootprint,foliageCanopyFootprint,TREE_FIXTURES}
  from '../src/worldgen/landscape-footprint.ts';
import {serviceFixtureInRoad} from '../src/worldgen/road-service-fixtures.ts';

const zone={id:'arrival-forecourt',kind:'yard',x:120,y:280,w:190,h:90};
test('mailboxes and outdoor electrical hardware follow frontage and archetype',()=>{
 assert.equal(outdoorFixtureAllowed({archetype:'house'},zone,'mailbox'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'apartment'},zone,'mailbox'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'clinic'},zone,'mailbox'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},zone,'utility-cabinet'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},
  {...zone,id:'rear-property',kind:'service'},'utility-cabinet'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},
  {...zone,id:'rear-property',kind:'garden'},'mailbox'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'retail'},
  {...zone,kind:'parking'},'parking-sign'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},zone,'hydrant'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},
  {...zone,id:'rear-property'},'hydrant'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'retail'},zone,'bike-rack'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},zone,'bike-rack'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'retail'},
  {...zone,kind:'parking'},'parking-block'),false);
});

test('frontage hardware sits at the street edge, to either side of approach',()=>{
 const points=frontageEdgeCandidates({entrySide:'south'},zone,'mailbox',14,13);
 assert.equal(points?.length,2);
 assert.ok(points[0].x<zone.x&&points[1].x>zone.x);
 assert.ok(points.every(p=>p.y>zone.y+20));
 const sideways=frontageEdgeCandidates({entrySide:'east'},
  {...zone,x:250,y:240,w:90,h:190},'parking-sign',13,11);
 assert.equal(sideways?.length,2);
 assert.ok(sideways.every(p=>p.x>250));
 assert.equal(frontageEdgeCandidates({entrySide:'south'},zone,
  'shrub-round',30,28),null);
});

test('trees use real narrow physical trunks while keeping full pixel-card crowns',()=>{
 for(const id of TREE_FIXTURES){
  const size=landscapePhysicalFootprint(id,52,52);
  assert.deepEqual(size,{w:14,h:14});
  assert.deepEqual(foliageCanopyFootprint(id,size.w,size.h,52,52),{w:52,h:52});
 }
 assert.deepEqual(landscapePhysicalFootprint('shrub-round',30,28),{w:30,h:28});
});

test('retired car assets never spawn in new missions of all archetypes',()=>{
 const retired=new Set(['vehicle','sedan','pickup','van','suv']);
 let vegetation=0,greenSites=0;
 for(let seed=1;seed<=44;seed++){
   const site=generateSite(seed);
   assert.ok(site.cover.every(c=>!retired.has(c.fixture??'')),
     'retired car in seed '+seed);
   const green=site.cover.filter(c=>
     TREE_FIXTURES.has(c.fixture??'')||
     ['shrub-round','shrub-tall','hedge'].includes(c.fixture??''));
   vegetation+=green.length;
   if(green.length)greenSites++;
   assert.ok(green.every(c=>!TREE_FIXTURES.has(c.fixture??'')||
     c.w<=14&&c.h<=14),'tree collision too large '+seed);
 }
 assert.ok(vegetation>0&&greenSites>0,'outdoor greenery must not disappear');
});

test('street utility collision still rejects fixed service equipment',()=>{
 const site={entrySide:'south',entrance:{x:180,y:370},
   bounds:{minX:0,minY:0,maxX:500,maxY:610}};
 assert.equal(serviceFixtureInRoad(site,'utility-cabinet',
  {x:180,y:500,w:32,h:22}),true);
 assert.equal(serviceFixtureInRoad(site,'utility-cabinet',
  {x:300,y:500,w:32,h:22}),false);
 const code=readFileSync(new URL('../src/worldgen/exterior-sites.ts',import.meta.url),'utf8');
 assert.doesNotMatch(code,/parking:\['sedan'/);
 assert.doesNotMatch(code,/driveway:residential\?\['sedan'/);
 assert.match(code,/outdoorFixtureAllowed\(site,zone,item\)/);
 assert.match(code,/frontageEdgeCandidates\(site,zone,item,w,h\)/);
});
