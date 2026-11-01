import test from 'node:test';import assert from 'node:assert/strict';
import {newSerializedWeapon,recordWeaponRounds,serviceSerializedWeapon,
 readSerializedWeapons,MAX_WEAPON_HISTORY,MAX_OWNED_WEAPONS}
 from '../src/equipment-weapon-identity.ts';
test('27.00 serialized weapons have stable ID independent of kit choice',()=>{
 const a=newSerializedWeapon('campaign:17:weapon:01','carbine',4);
 assert.equal(a.id,'campaign:17:weapon:01');
 assert.equal(a.condition,100);
 assert.equal(a.history[0].kind,'acquired');
 assert.equal(readSerializedWeapons(JSON.parse(JSON.stringify([a])))[0].id,a.id);
});
test('27.00 wear comes from actual fired rounds and servicing is explicit',()=>{
 const w=newSerializedWeapon('w1','smg');
 assert.equal(recordWeaponRounds(w,0,1),w);
 const a=recordWeaponRounds(w,74,1,'contract-1');
 assert.equal(a.condition,100);
 const b=recordWeaponRounds(a,2,1,'contract-1');
 assert.equal(b.condition,99);
 assert.equal(b.roundsFired,76);
 assert.equal(w.roundsFired,0);
 const c=serviceSerializedWeapon(b,2,1);
 assert.equal(c.condition,100);
 assert.equal(c.lastServiceDay,2);
 assert.equal(c.history.at(-1).kind,'serviced');
});
test('27.00 corrupt saves cannot duplicate assets or invent invalid platforms',()=>{
 const one=newSerializedWeapon('unique','rifle');
 const r=readSerializedWeapons([one,{...one,condition:900},
  {id:'bad',platform:'rocket',condition:100},null,
  {...one,id:'another',condition:-4,roundsFired:Infinity,
   history:[{id:'x',kind:'fired',day:-1},
     {id:'x',kind:'fired',day:2}]}]);
 assert.equal(r.length,2);
 assert.equal(r[1].condition,0);
 assert.equal(r[1].roundsFired,0);
 assert.equal(r[1].history.length,1);
 assert.equal(readSerializedWeapons(Array.from({length:200},(_,i)=>({
  ...one,id:'weapon:'+i}))).length,MAX_OWNED_WEAPONS);
 let current=one;
 for(let i=0;i<40;i++)current=recordWeaponRounds(current,75,i);
 assert.equal(current.history.length,MAX_WEAPON_HISTORY);
});
