import test from 'node:test';
import assert from 'node:assert/strict';
import {countNearbyEnemyAllies,moraleResponse}
  from '../src/breach-ai-morale.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

function oldSupport(s,a){
 return enemies(s).filter(other=>other!==a&&other.health>0&&
   other.encounterGroupId===a.encounterGroupId&&
   Math.hypot(other.p.x-a.p.x,other.p.y-a.p.y)<130).length;
}
test('direct red-peer roster scan equals old enemies-filter scan for every group',()=>{
 try{
  for(const seed of [12,110,502]){
   const s=newSession(0,seed,'full-view');
   for(const actor of s.operators){
     for(const hostile of enemies(s)){
       assert.equal(countNearbyEnemyAllies(hostile,s.operators),
         oldSupport(s,hostile));
     }
     if(actor.side==='blue')actor.encounterGroupId='same-as-red';
   }
  }
 }finally{activateSite(null);}
});
test('peer support respects side, group, health, identity and strict boundary',()=>{
 const a={side:'red',health:4,encounterGroupId:'x',p:{x:0,y:0}};
 const b={side:'red',health:2,encounterGroupId:'x',p:{x:129.99,y:0}};
 const c={side:'red',health:2,encounterGroupId:'x',p:{x:130,y:0}};
 const d={side:'red',health:0,encounterGroupId:'x',p:{x:2,y:0}};
 const e={side:'red',health:2,encounterGroupId:'y',p:{x:2,y:0}};
 const f={side:'blue',health:4,encounterGroupId:'x',p:{x:2,y:0}};
 assert.equal(countNearbyEnemyAllies(a,[a,b,c,d,e,f]),1);
 assert.equal(countNearbyEnemyAllies(a,[a]),0);
 const calm=moraleResponse(.4,.5,0,'guard',{nearbyAllies:1});
 const old=moraleResponse(.4,.5,0,'guard',{nearbyAllies:
   [a,b,c,d,e,f].filter(o=>o!==a&&o.side==='red'&&o.health>0&&
     o.encounterGroupId===a.encounterGroupId&&
     Math.hypot(o.p.x-a.p.x,o.p.y-a.p.y)<130).length});
 assert.equal(calm,old);
});
test('missing encounter group still behaves as old undefined equals undefined',()=>{
 const actor={side:'red',health:4,p:{x:10,y:15}};
 const other={side:'red',health:4,p:{x:11,y:15}};
 assert.equal(countNearbyEnemyAllies(actor,[actor,other]),1);
});
