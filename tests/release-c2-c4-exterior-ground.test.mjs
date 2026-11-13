import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planPublicStreet,overlapsPublicStreetRoad}
 from '../src/worldgen/public-street-layout.ts';
import {frontageEdgeCandidates}
 from '../src/worldgen/outdoor-fixture-policy.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {activateSite} from '../src/breach-core.ts';
test('C4: final site frontage agrees with cached road rejection and visual planner',()=>{
 try{
  for(const seed of [110,111,112,113,114,115,116,117,118,119,120]){
   const site=generateSite(seed,'small');
   const street=planPublicStreet(site);
   assert.deepEqual(street,planPublicStreet(site));
   if(!street)continue;
   assert.ok(site.cover.every(o=>
     !overlapsPublicStreetRoad(site,o,street)),
     'actual physical props cannot occupy the authored carriageway '+seed);
   for(const prop of site.cover){
    assert.equal(overlapsPublicStreetRoad(site,prop),
      overlapsPublicStreetRoad(site,prop,street));
   }
   const zone=site.exteriorZones?.find(z=>z.id==='arrival-forecourt');
   const mailbox=propDefinition('mailbox');
   if(zone&&mailbox){
    const a=frontageEdgeCandidates(site,zone,'mailbox',
      mailbox.width,mailbox.depth);
    const b=frontageEdgeCandidates(site,zone,'mailbox',
      mailbox.width,mailbox.depth,street);
    assert.deepEqual(a,b,'candidate placement shares the same street');
   }
  }
 }finally{activateSite(null);}
});
test('C4: a null cached street is authoritative, not a request to recompute',()=>{
 const s={entrySide:'south',rooms:[{x:0,y:0,w:100,h:100}],entrance:{x:45,y:100}};
 assert.equal(overlapsPublicStreetRoad(s,{x:30,y:200,w:25,h:25},null),false);
});
