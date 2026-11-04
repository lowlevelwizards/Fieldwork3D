import test from 'node:test';
import assert from 'node:assert/strict';
import {preparedDefenderValue,preparedWatchHeading,rankPreparedPositions}
 from '../src/worldgen/defender-cover-positions.ts';
import {directionalCoverFrom} from '../src/breach-cover-direction.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable} from '../src/breach-core.ts';
import {clearOfInsertion} from '../src/worldgen/encounter-spawn-safety.ts';

const room={id:'shop',kind:'room',purpose:'sales',x:0,y:0,w:160,h:160};
const door={id:'D',a:{x:0,y:60},b:{x:0,y:100}};
const counter={x:92,y:80,w:66,h:22,fixture:'bar-counter',low:false};
const site={rooms:[room],walls:[],doors:[door],openings:[],cover:[counter]};

test('R7C: prepared positions prefer real protective geometry with return fire',()=>{
 const protectedP={x:147,y:80},openP={x:147,y:130};
 const defensive=directionalCoverFrom({x:12,y:80},protectedP,[counter]);
 assert.equal(defensive.standing,false);
 assert.equal(defensive.crouched,true);
 assert.ok(preparedDefenderValue(site,room,protectedP)>
   preparedDefenderValue(site,room,openP));
 const points=rankPreparedPositions(site,room,[openP,protectedP]);
 assert.deepEqual(points[0],protectedP);
 assert.ok(Number.isFinite(preparedWatchHeading(site,room,protectedP,1)));
});
test('R7C: a site with no threshold preserves original watch orientation',()=>{
 assert.equal(preparedWatchHeading({...site,doors:[]},room,{x:70,y:80},1.234),1.234);
});
test('R7C: seeded defensive encounters remain deterministic, legal and spacious',()=>{
 try{
  for(const seed of [16,27,38]){
   const a=generateSite(seed,'small',undefined,
     {mission:'clear',premise:'defensive'});
   const b=generateSite(seed,'small',undefined,
     {mission:'clear',premise:'defensive'});
   assert.deepEqual(a.enemies,b.enemies);
   assert.deepEqual(a.enemyHeadings,b.enemyHeadings);
   activateSite(a);
   for(const p of a.enemies){
    assert.ok(passable(p),'prepared hostile cannot stand in furniture');
    assert.ok(clearOfInsertion(a,p),'no enemy at insertion');
   }
  }
 }finally{activateSite(null);}
});
