import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentPreviewSignature} from '../src/equipment-preview-signature.ts';

const kit=()=>({version:1,slots:{primary:'primary-carbine',head:'ach',rig:'chest-rig'},
 fieldInventory:{bandage:{quantity:2,location:'rig'}}});
const mags=()=>[{id:'m1',ammo:20,location:'rig'}];
const config=()=>({version:1,weapon:'carbine',slots:{optic:'reflex'}});
const wardrobe=()=>({styles:{headwear:'ach',top:'bdu'},helmetCover:'woodland'});
const sign=(o={})=>equipmentPreviewSignature(o.id??'rook',
 o.weapon??'carbine',o.seed??12,o.kit??kit(),
 o.config??config(),o.magazines??mags(),o.wardrobe??wardrobe(),
 o.held??true);

test('P3.C identical validated snapshot values reuse the same operator preview',()=>{
 assert.equal(sign(),sign({kit:kit(),config:config(),magazines:mags(),wardrobe:wardrobe()}));
});
test('P3.C operator, weapon, appearance and held-weapon changes are distinct',()=>{
 const baseline=sign();
 for(const alt of [{id:'moss'},{weapon:'rifle'},{seed:13},{held:false}])
  assert.notEqual(sign(alt),baseline,JSON.stringify(alt));
});
test('P3.C every visual and carry input invalidates the cache signature',()=>{
 const baseline=sign(),k=kit(),m=mags(),w=wardrobe(),g=config();
 k.slots.head='pasgt';assert.notEqual(sign({kit:k}),baseline);
 m[0].ammo=15;assert.notEqual(sign({magazines:m}),baseline);
 w.styles.headwear='boonie';assert.notEqual(sign({wardrobe:w}),baseline);
 g.slots.optic='iron';assert.notEqual(sign({config:g}),baseline);
});
test('P3.C unknown nonserializable state cannot silently claim a cache hit',()=>{
 const k=kit();k.self=k;
 assert.equal(sign({kit:k}),null);
});
test('P3.C unchanged update does not rebuild poses or evict real thumbnail cache',()=>{
 const c=readFileSync(new URL('../src/equipment-preview.ts',import.meta.url),'utf8');
 const start=c.indexOf(' updateEquipment(weapon:WeaponId');
 const end=c.indexOf(' private poseForThumb(',start);
 const method=c.slice(start,end);
 assert.ok(start>=0&&end>start);
 const key=method.indexOf('const signature=equipmentPreviewSignature(');
 const fast=method.indexOf('if(signature!==null&&signature===this.visualSignature)');
 const invalidation=method.indexOf('this.thumbnailRevision++');
 const pose=method.indexOf('this.poseForThumb(');
 assert.ok(key>=0&&fast>key&&invalidation>fast&&pose>invalidation);
 assert.match(method.slice(fast,invalidation),/this\.draw\(\);\s*return;/);
 assert.match(method.slice(invalidation),/this\.modelThumbCache\.clear\(\)/);
 assert.match(c,/setOperatorId\(id:string\):void\{[\s\S]*?this\.visualSignature=null/);
 assert.match(c,/this\.modelThumbCache\.clear\(\);this\.visualSignature=null;/);
});
