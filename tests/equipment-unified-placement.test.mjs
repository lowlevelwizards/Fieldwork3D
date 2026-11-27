import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedWaistSlots,fixedWaistCandidates,waistPlacementsConflict,clothingStorage,packStorage,registeredRigStorage,modularArmorStorage}
 from '../src/equipment-fixed-carrier-slots.ts';
import {resolveUnifiedCarry,removeManifestContent} from '../src/equipment-unified-placement.ts';
const dimensions=(width,height,depth)=>({width,height,depth});
const item=(id,kind,w,h,d,extra={})=>({id,kind,dimensions:dimensions(w,h,d),...extra});
const kit=(belt,items,storage=[],extra={})=>({belt,items,storage,...extra});
const byId=(m,id)=>m.placements.find(p=>p.itemIds.includes(id));
function noOverlap(m){
 const slots=m.placements.flatMap(p=>p.slotIds),ids=m.placements.flatMap(p=>p.itemIds);
 assert.equal(new Set(slots).size,slots.length,'unique physical claims');
 assert.equal(new Set(ids).size,ids.length,'unique content identity');
 const waist=m.placements.flatMap(p=>p.waist?[p.waist]:[]);
 for(let i=0;i<waist.length;i++)for(let j=i+1;j<waist.length;j++)
  assert.equal(waistPlacementsConflict(waist[i],waist[j]),false);
}
test('BT4 fixed waist slots: no belt, reversible leather, utility, battle, padded',()=>{
 const styles=['no-belt','plain-belt','duty-belt','battle-belt','padded-belt'];
 assert.deepEqual(styles.map(s=>fixedWaistSlots(s).length),[0,1,4,5,7]);
 assert.equal(fixedWaistSlots('plain-belt','left')[0].region,'left-hip');
 assert.equal(fixedWaistSlots('padded-belt','right',true).length,0);
 for(const s of styles)assert.equal(new Set(fixedWaistSlots(s).map(p=>p.id)).size,fixedWaistSlots(s).length);
});
test('BT4: large dump pouch claims the three rear positions; no other rear object can share them',()=>{
 const m=resolveUnifiedCarry(kit('padded-belt',[item('dump','dump',7,6,4)]));
 assert.equal(m.valid,true);assert.equal(byId(m,'dump').waist.region,'rear');
 assert.equal(byId(m,'dump').slotIds.length,3);noOverlap(m);
 const slots=fixedWaistSlots('padded-belt');
 const wide=fixedWaistCandidates('padded-belt',slots,dimensions(7.5,7.1,4.8),['rear'])[0];
 const narrow=fixedWaistCandidates('padded-belt',slots,dimensions(2,3,1),['rear-left'])[0];
 assert.ok(waistPlacementsConflict(wide,narrow));
});
test('BT4: no carrier means no storage; actual clothing and hydration limits',()=>{
 assert.equal(clothingStorage('bdu-trousers','legs-none').length,0);
 assert.equal(clothingStorage('jeans','legs-light').length,1);
 assert.equal(clothingStorage('bdu-trousers','legs-field').length,2);
 assert.equal(packStorage('hydration').length,0);
 assert.equal(packStorage('rucksack').length,24);
 assert.equal(packStorage('assault-panel',false).length,0);
 const med=item('light','light',1,3,1);
 assert.equal(resolveUnifiedCarry(kit('no-belt',[med])).valid,false);
 const m=resolveUnifiedCarry(kit('no-belt',[med],clothingStorage('jeans','legs-light')));
 assert.equal(byId(m,'light').carrier,'pocket');assert.equal(byId(m,'light').concealed,true);
});
test('BT4: real dedicated rig cell is preferred; incompatible magazine moves to belt or pack',()=>{
 const cells=registeredRigStorage([{x:0,y:0,z:0,width:3,depth:2,height:4}]);
 const items=[item('a','primary-mag',2,4,1),item('b','primary-mag',4.0,5,1.8)];
 const m=resolveUnifiedCarry(kit('duty-belt',items,[...cells,...packStorage('day-pack')]));
 assert.equal(byId(m,'a').carrier,'rig');
 assert.notEqual(byId(m,'b').carrier,'rig');assert.equal(m.valid,true);noOverlap(m);
});
test('BT4: pistol magazine pair can share a double holder with distinct content IDs',()=>{
 const m=resolveUnifiedCarry(kit('duty-belt',[
  item('sidearm','sidearm',2,5,1),item('p2','secondary-mag',1.3,3,1),item('p1','secondary-mag',1.3,3,1)]));
 assert.equal(m.valid,true);
 assert.equal(byId(m,'sidearm').waist.region,'right-hip');
 const p=byId(m,'p1');assert.equal(p.variant,'double');assert.deepEqual(p.itemIds,['p1','p2']);
 noOverlap(m);
 const spent=removeManifestContent(m,'p1');
 assert.deepEqual(byId(spent,'p2').slotIds,p.slotIds);
 assert.deepEqual(byId(spent,'p2').itemIds,['p2']);
 const empty=removeManifestContent(spent,'p2');
 assert.ok(empty.placements.some(x=>!x.itemIds.length&&x.holder==='pistol-mag-pouch'));
});
test('BT4: authored armor and rig cannot independently claim the same front',()=>{
 assert.equal(modularArmorStorage('plate-slick','no-rig',7,9,5,-5).length,0);
 assert.equal(modularArmorStorage('plate-standard','light-rig',7,10.5,5,-5).length,0);
 const slots=modularArmorStorage('plate-standard','no-rig',7,10.5,5,-5);
 const m=resolveUnifiedCarry(kit('no-belt',[item('med','medical',4,3,2),
  item('radio','radio',2,5,1),item('flash','flash',2.4,5,2.4)],slots));
 noOverlap(m);assert.ok(m.unplaced.length>0);
});
test('BT4: deterministic across item order, no duplicate identity, optional cosmetics never displace mandatory items',()=>{
 const storage=[...packStorage('day-pack'),...clothingStorage('bdu-trousers','legs-field')];
 const items=[item('med','medical',4,3,2),item('p','secondary-mag',1.3,3,1),item('flash','flash',2.5,5.8,2.5),
  item('holster','sidearm',2,5,1),item('dump','dump',7,6,4,{optional:true})];
 const a=resolveUnifiedCarry(kit('padded-belt',items,storage)),b=resolveUnifiedCarry(kit('padded-belt',[...items].reverse(),[...storage].reverse()));
 assert.deepEqual(a,b);noOverlap(a);assert.equal(a.valid,true);
 const dup=resolveUnifiedCarry(kit('padded-belt',[items[0],items[0]],storage));
 assert.equal(dup.valid,false);assert.deepEqual(dup.unplaced,[{id:'med',reason:'duplicate'}]);
 const limited=resolveUnifiedCarry(kit('plain-belt',[item('sidearm','sidearm',2,5,1),
  item('decor','cosmetic',1,1,1,{holder:'rigid-holster',optional:true})]));
 assert.equal(limited.valid,true);assert.ok(byId(limited,'sidearm'));assert.equal(byId(limited,'decor'),undefined);
});
test('BT4: bounded search yields a complete diagnostic for impossible loads and conserves all IDs',()=>{
 const items=Array.from({length:16},(_,i)=>item('m'+i,'primary-mag',2,4,1));
 const m=resolveUnifiedCarry(kit('no-belt',items,packStorage('assault-panel')),50);
 assert.equal(m.valid,false);assert.equal(m.placements.flatMap(p=>p.itemIds).length,4);
 assert.equal(m.unplaced.length,12);noOverlap(m);
 assert.deepEqual([...m.placements.flatMap(p=>p.itemIds),...m.unplaced.map(p=>p.id)].sort(),items.map(i=>i.id).sort());
});
