import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WEAPON_FINISH_SPECS,weaponFinish,weaponMaterialCacheSize}
 from '../src/weapons/geometry/weapon-material-registry.ts';
import * as palette from '../src/weapons/geometry/weapon-visual-palette.ts';
import {ARSENAL_FINISH_FAMILIES,arsenalFinishOption,validArsenalFinishTaxonomy}
 from '../src/arsenal/finishes.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {collectArsenalA1Manifest} from '../scripts/audit-arsenal-a1.mjs';

test('A2 shared palette: each finish has a role, exact PBR substrate response and cached material',()=>{
 for(const [id,spec] of Object.entries(WEAPON_FINISH_SPECS)){
  const material=weaponFinish(id);
  assert.strictEqual(material,weaponFinish(id),id+' must use one material');
  assert.equal(material.color.getHex(),spec.color,id+' color');
  assert.equal(material.roughness,spec.roughness,id+' roughness');
  assert.equal(material.metalness,spec.metalness,id+' metalness');
  assert.equal(visualMaterialRole(material),spec.role,id+' role');
  assert.equal(material.flatShading,true,id+' faceted miniatures');
  if(spec.role==='polymer'||spec.role==='paint')
   assert.ok(material.metalness<=.02,id+' non-metallic response');
  if(spec.role==='wood')
   assert.equal(material.metalness,0,id+' wood never metallic');
 }
 assert.strictEqual(palette.FAL_WOOD,palette.HK_WOOD,'historically identical wood finish is shared');
 assert.strictEqual(palette.FAL_MAG_METAL,palette.HK_MAG_METAL,'shared G3/FAL steel magazine');
 assert.strictEqual(palette.FAL_MUZZLE_METAL,palette.HK_MUZZLE_METAL);
 assert.ok(weaponMaterialCacheSize()<=Object.keys(WEAPON_FINISH_SPECS).length);
});

test('A2 AR, AK, HK, FAL and FNC all receive authored material refinements',()=>{
 assert.equal(palette.AR_BLACK_METAL.metalness,.12);
 assert.equal(palette.AK_BLACK_POLYMER.metalness,.015);
 assert.equal(palette.AK_DARK_WOOD.metalness,0);
 assert.equal(palette.AK_COVER_STAMP_METAL.type,'MeshStandardMaterial');
 assert.equal(palette.AK_COVER_STAMP_METAL.color.getHex(),0x728077);
 assert.equal(palette.HK_BLACK_METAL.color.getHex(),0x3e4441);
 assert.equal(palette.HK_WA8_RIFLE_STEEL.color.getHex(),0x474e50);
 assert.equal(palette.HK_WA8_RIFLE_POLYMER.color.getHex(),0x303831);
 assert.equal(palette.FAL_BLACK_METAL.color.getHex(),0x495052,'WA4 reviewed cool-neutral steel');
 assert.equal(palette.FAL_DARK_POLYMER.color.getHex(),0x343d32);
 assert.equal(palette.FNC_BLACK_METAL.color.getHex(),0x474e50);
 assert.equal(palette.FNC_DARK_POLYMER.color.getHex(),0x303831);
 assert.notStrictEqual(palette.FNC_BLACK_METAL,palette.HK_BLACK_METAL);
 assert.equal(palette.FAL_DARK_POLYMER.metalness,.015);
 // WA4 FNC steel/polymer use scoped calibrated finishes; FAL lower/fore-end
 // finish sharing is retained, and HK must not inherit this calibration.
 const fnc=readFileSync(new URL('../src/weapons/geometry/fnc-silhouettes.ts',import.meta.url),'utf8');
 assert.match(fnc,/FNC_BLACK_METAL/);
 assert.doesNotMatch(fnc,/HK_BLACK_METAL/);
 assert.match(fnc,/FAL_DARK_POLYMER/);
 const ak=readFileSync(new URL('../src/weapons/geometry/ak-silhouettes.ts',import.meta.url),'utf8');
 assert.doesNotMatch(ak,/new THREE\.MeshLambertMaterial/);
 assert.match(ak,/AK_WA7_COVER_ACCENT/);
 assert.equal(palette.AK_WA7_COVER_ACCENT.color.getHex(),0x5c6562);
 assert.equal(palette.AK_WA7_STEEL.color.getHex(),0x4a5051);
 assert.equal(palette.AK_WA7_POLYMER.color.getHex(),0x343b32);
});

test('A2 all existing finish swatches derive from the same approved material specs',()=>{
 assert.deepEqual(validArsenalFinishTaxonomy(),[]);
 for(const group of ARSENAL_FINISH_FAMILIES){
  for(const option of group.options)assert.match(option.hex,/^[0-9a-f]{6}$/);
 }
 for(const [part,finish] of [
  ['ar-grip-poly','ar-wa6-polymer'],['ar-grip-poly-fde','ar-fde'],
  ['ak-wood','ak-wood-dark'],['ak-wood-amber','ak-wood-amber'],
  ['ak-wood-red','ak-wood-red'],['ak-grip-bakelite','ak-resin'],
  ['ak-sidefold','ak-wa7-polymer'],['ak-sidefold-plum','ak-plum-polymer'],
  ['hk33-fixed-stock','hk-olive-polymer'],
  ['hk33-fixed-stock-black','hk-wa8-rifle-polymer']
 ]){
  const option=arsenalFinishOption(part);
  // Bakelite is a valid authored material but not a same-geometry swatch option.
  if(part==='ak-grip-bakelite'){assert.equal(option,undefined);continue;}
  assert.equal(option?.hex,WEAPON_FINISH_SPECS[finish].color.toString(16).padStart(6,'0'),part);
 }
 const source=readFileSync(new URL('../src/arsenal/finishes.ts',import.meta.url),'utf8');
 assert.match(source,/WEAPON_FINISH_SPECS/);
 assert.doesNotMatch(source,/'[0-9a-f]{6}'/,'hex literals would reintroduce swatch drift');
});

test('A2 canonical accessories survive the actual attachment compatibility path',()=>{
 const steel=new THREE.MeshBasicMaterial({color:0xffffff});
 const polymer=new THREE.MeshBasicMaterial({color:0xffffff});
 const cfg=setWeaponAttachment(
  selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1'),
  'light','light-compact');
 assert.equal(cfg.slots.light,'light-compact');
 const model=buildWeaponAccessories(cfg,steel,polymer);
 assert.ok(model.children.some(x=>x.material===palette.WEAPON_ACCESSORY_STEEL));
 assert.ok(model.children.some(x=>x.material===palette.WEAPON_ACCESSORY_POLYMER));
 const lens=model.getObjectByName('weapon-light-lens');
 assert.ok(lens instanceof THREE.Mesh);
 assert.equal(lens.visible,false,'the game controls light on/off');
 assert.strictEqual(lens.material,steel,'lens override contract retained');
 for(const node of model.children)if(node instanceof THREE.Mesh)node.geometry.dispose();
 // Explicit legacy shotgun keeps caller materials, not a hidden recolor.
 const shotgun=buildWeaponAccessories(
  setWeaponAttachment(initialWeaponConfiguration('shotgun'),'light','light-compact'),
  steel,polymer);
 for(const node of shotgun.children)
  if(node instanceof THREE.Mesh)assert.ok(
   node.material===steel||node.material===polymer,'legacy fallback material');
 for(const node of shotgun.children)if(node instanceof THREE.Mesh)node.geometry.dispose();
 steel.dispose();polymer.dispose();
});

test('A2 complete current factory inventory retains catalog identifiers and FNC benchmark',()=>{
 const m=collectArsenalA1Manifest();
 // The historical 35-reference A1 totals remain in its dated report.
 // Current coverage is catalog-derived; WA3 exact geometry parity is checked
 // independently against a pinned revision rather than freezing old totals.
 assert.equal(m.totals.presets,ARSENAL_REFERENCES.length);
 assert.deepEqual(m.presets.map(p=>p.id).sort(),ARSENAL_REFERENCES.map(p=>p.id).sort());
 const expected={};for(const r of ARSENAL_REFERENCES)expected[r.platformId]=(expected[r.platformId]??0)+1;
 assert.deepEqual(m.totals.byPlatform,expected);
 assert.equal(m.totals.meshes,m.presets.reduce((n,p)=>n+p.meshes,0));
 assert.equal(m.totals.triangles,m.presets.reduce((n,p)=>n+p.triangles,0));
 assert.equal(m.presets.find(p=>p.id==='fnc-service')?.meshes,23);
 assert.equal(m.presets.find(p=>p.id==='fnc-service')?.triangles,536);
});

test('A2 no extra viewer material allocations, no shared material disposal',()=>{
 for(const path of ['src/arsenal/viewport.ts','src/arsenal/thumbnailer.ts',
  'src/equipment-weapon-workbench.ts']){
  const text=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(text,/private readonly steel=WEAPON_ACCESSORY_STEEL/);
  assert.match(text,/private readonly dark=WEAPON_ACCESSORY_POLYMER/);
  assert.doesNotMatch(text,/this\.(steel|dark)\.dispose\(/);
 }
 const browser=readFileSync(new URL('../src/arsenal/a1-capture.ts',import.meta.url),'utf8');
 assert.match(browser,/const accessoryReview=/);
 assert.match(browser,/setWeaponAttachment/);
});
