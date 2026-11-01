import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/breach-combat.ts';
import {reserveRounds} from '../src/breach-magazines.ts';
import {readPersistentMagazines,readLoadedMagazineId,addReserveRounds}
 from '../src/equipment-magazine-persistence.ts';
import {newCampaign,readCampaign,resupplyOperator,
 acceptContract,resolveOperation,buyWeapon,equipCampaignWeapon} from '../src/campaign-state.ts';

test('magazine save normalization keeps partial rounds and rejects duplicates and fabricated ammo',()=>{
 const mags=[{id:'rook/carbine/a',weapon:'carbine',rounds:7},
  {id:'rook/carbine/b',weapon:'carbine',rounds:3}];
 assert.deepEqual(readPersistentMagazines('rook','carbine',10,mags),mags);
 assert.equal(readPersistentMagazines('rook','carbine',10,[mags[0],mags[0]])
  .reduce((a,b)=>a+b.rounds,0),10);
 assert.equal(reserveRounds(readPersistentMagazines('rook','carbine',10,
  [{...mags[0],rounds:999}])),10);
 assert.equal(readLoadedMagazineId('rook','carbine','rook/carbine/a',mags),
  'rook/carbine/loaded','loaded ID cannot also exist in spares');
});
test('campaign saves preserve individual magazine IDs and upgrade old aggregate saves',()=>{
 const c=newCampaign(18);
 assert.equal(reserveRounds(c.operators[0].magazines),c.operators[0].reserve);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 const old=JSON.parse(JSON.stringify(c));
 for(const m of old.operators){delete m.magazines;delete m.loadedMagazineId;}
 const migrated=readCampaign(JSON.stringify(old));
 assert.equal(migrated.operators[1].magazines[0].weapon,'smg');
 assert.equal(reserveRounds(migrated.operators[1].magazines),migrated.operators[1].reserve);
 assert.equal(migrated.operators[0].loadedMagazineId,'rook/carbine/loaded');
});
test('partially used magazines from the actual mission persist into the next operation',()=>{
 let c=newCampaign(12);
 const job=c.contracts[0];c=acceptContract(c,job.id);
 const ids=c.operators[0].magazines.map(m=>m.id);
 const remaining=[{id:ids[0],weapon:'carbine',rounds:5},
  {id:ids[1],weapon:'carbine',rounds:11}];
 const result=resolveOperation(c,{id:'kit-partials',contractId:job.id,
  day:c.day,outcome:'success',grade:'B',elapsed:30,
  participatingIds:['rook'],casualties:[],objective:true,events:[],
  performance:[{id:'rook',shots:8,hits:3,pointShots:4,aimedShots:4,longHits:0,
   injuryStage:0,survived:true,magazine:4,reserve:16,
   spareMagazines:remaining,loadedMagazineId:'rook/carbine/current'}]});
 assert.deepEqual(result.operators[0].magazines,remaining);
 assert.equal(result.operators[0].loadedMagazineId,'rook/carbine/current');
 assert.deepEqual(readCampaign(JSON.stringify(result)),result);
 assert.deepEqual(resolveOperation(result,{id:'kit-partials',contractId:job.id,
  day:c.day,outcome:'success',grade:'B',elapsed:30,
  participatingIds:['rook'],casualties:[],objective:true,events:[]}),result);
});
test('campaign resupply keeps existing IDs, fills partials and never mints extra rounds',()=>{
 const base=newCampaign(44);
 const short={...base,operators:base.operators.map((o,i)=>i===0?{
  ...o,magazine:3,reserve:10,magazines:[
   {id:o.magazines[0].id,weapon:o.weapon,rounds:4},
   {id:o.magazines[1].id,weapon:o.weapon,rounds:6}
  ]}:o)};
 const resupplied=resupplyOperator(short,'rook');
 const member=resupplied.operators[0];
 assert.equal(member.magazine,WEAPONS.carbine.capacity);
 assert.equal(reserveRounds(member.magazines),member.reserve);
 assert.equal(member.magazines[0].id,short.operators[0].magazines[0].id);
 assert.equal(member.magazines[1].id,short.operators[0].magazines[1].id);
 const consumed=(member.magazine-3)+(member.reserve-10);
 assert.equal(resupplied.supplies.ammo,short.supplies.ammo-consumed);
});
test('weapon swaps cannot retain stale, incompatible magazine instances',()=>{
 let c=newCampaign(54);
 c=buyWeapon(c,'rifle');
 c=equipCampaignWeapon(c,'rook','rifle');
 assert.deepEqual(c.operators[0].magazines,[]);
 assert.equal(c.operators[0].loadedMagazineId,'rook/rifle/loaded');
 assert.equal(c.operators[0].reserve,0);
});
