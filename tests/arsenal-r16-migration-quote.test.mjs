import test from 'node:test';
import assert from 'node:assert/strict';
import {magazineKit} from '../src/breach-magazines.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {quoteArsenalMagazineMigration}
 from '../src/arsenal/magazine-migration-quote.ts';
const recipe=(weapon,id)=>{
 const x=arsenalRecipeFromLegacy(selectWeaponFamilyPreset(
  initialWeaponConfiguration(weapon),id));
 assert.ok(x);return x;
};
test('legal 12-round carbine inventory previews physical 30-round magazines without free ammo',()=>{
 const r=recipe('carbine','ar-m4a1');
 const mags=magazineKit('rook','carbine',36,12);
 mags[0].location='rig';
 const input=structuredClone(mags);
 const q=quoteArsenalMagazineMigration(r,12,36,mags);
 assert.equal(q.valid,true);
 assert.equal(q.profile.nominalRounds,30);
 assert.equal(q.profile.simulatedCapacity,12);
 assert.equal(q.roundsBefore,48);assert.equal(q.roundsAfter,48);
 assert.deepEqual(q.spares,input);assert.notEqual(q.spares,mags);
 assert.equal(q.spares[0].location,'rig');
 assert.equal(q.requiresVersionedMigration,true);
 assert.deepEqual(mags,input,'preflight must not mutate inventory');
});
test('mismatched reserves, duplicate IDs, wrong class and excess rounds are rejected',()=>{
 const r=recipe('smg','hk-mp5a3');
 const good=magazineKit('moss','smg',54,18);
 assert.equal(quoteArsenalMagazineMigration(r,18,53,good).valid,false);
 assert.equal(quoteArsenalMagazineMigration(r,19,54,good).valid,false);
 assert.equal(quoteArsenalMagazineMigration(r,18,54,
  [...good,{...good[0]}]).valid,false);
 assert.equal(quoteArsenalMagazineMigration(r,18,54,
  good.map((m,i)=>i===0?{...m,weapon:'rifle'}:m)).valid,false);
});
test('the 45-round RPK physical profile is not silently treated as a 10-round magazine',()=>{
 const r=recipe('rifle','ak-rpk74');
 const q=quoteArsenalMagazineMigration(r,10,30,magazineKit('ash','rifle',30,10));
 assert.equal(q.valid,true);
 assert.equal(q.profile.nominalRounds,45);
 assert.equal(q.profile.simulatedCapacity,10);
 assert.equal(q.roundsAfter,40);
});
