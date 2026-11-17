/** M3.0C3: opt-in, whole-factory modular assembly preservation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {compileRigidWeaponPartPilot}
 from '../src/weapons/geometry/rigid-weapon-part-pilot.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {measureWeaponVisual,auditRigidPartCandidates}
 from '../scripts/audit-weapon-production-m30.mjs';

const slots=['receiver','barrel','handguard','stock','grip'];
const ids=['ak-akms','ak-aks74u','ar-m4a1'];
const points=box=>[...box.min.toArray(),...box.max.toArray()];
function approx(a,b,label,tolerance=.00005){
 assert.ok(a&&b,label+' missing bound');
 for(let i=0;i<6;i++)
  assert.ok(Math.abs(points(a)[i]-points(b)[i])<=tolerance,
   label+' coordinate '+i+' drift: '+points(a)[i]+' vs '+points(b)[i]);
}
function load(id){
 const ref=ARSENAL_REFERENCES.find(r=>r.id===id);
 assert.ok(ref,'missing factory reference '+id);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 assert.ok(config.build,'missing installed modular parts '+id);
 return config;
}
test('M3.0C3 real AKMS, AKS-74U and M4 remain fully selectable with isolated magazine',()=>{
 for(const id of ids){
  const config=load(id),saved=structuredClone(config);
  const steel=new THREE.MeshBasicMaterial(),polymer=new THREE.MeshBasicMaterial();
  const root=buildWeaponSilhouette(config.weapon,steel,polymer,config);
  try{
   const base=measureWeaponVisual(root);
   const bodyBounds=new THREE.Box3().setFromObject(root);
   const parts=new Map(slots.map(s=>[s,partVisualBounds(root,s)]));
   const magazine=root.children.filter(x=>x.name.startsWith('family-magazine-'));
   assert.ok(magazine.length,id+' magazine must still be detached for reload');
   const magazineNames=magazine.map(x=>x.name);
   const magBounds=partVisualBounds(root,'magazine');
   const eligible=auditRigidPartCandidates(root);
   assert.ok(eligible.potentialSavedSubmissions>0,id+' had no candidates');
   const runs=slots.map(slot=>
    compileRigidWeaponPartPilot(root,slot,config.build.parts[slot]));
   const saving=runs.reduce((n,x)=>n+x.avoidedSubmissions,0);
   assert.ok(saving>=5,id+' must actually save rigid meshes');
   const after=measureWeaponVisual(root);
   assert.equal(base.submissions-after.submissions,saving,
    'reported gain must match actual visible mesh submissions');
   assert.equal(base.triangles,after.triangles,'no geometry loss');
   approx(bodyBounds,new THREE.Box3().setFromObject(root),id+' whole silhouette');
   for(const slot of slots){
    approx(parts.get(slot),partVisualBounds(root,slot),id+' '+slot);
    const names=root.children.filter(x=>x.name.startsWith('family-'+slot+'-'));
    assert.ok(names.length,id+' lost selectable '+slot);
   }
   assert.deepEqual(root.children.filter(x=>x.name.startsWith('family-magazine-'))
    .map(x=>x.name),magazineNames);
   assert.ok(magazine.every(x=>root.children.includes(x)),
    'magazine meshes must retain independent reference identity');
   approx(magBounds,partVisualBounds(root,'magazine'),id+' magazine');
   assert.deepEqual(config,saved,'compiler must never mutate saved loadout');
   runs.slice().reverse().forEach(r=>r.restore());
   assert.deepEqual(measureWeaponVisual(root),base,
    'all original mesh draw contracts should restore');
   runs.forEach(r=>r.restore()); // idempotent
  }finally{clearWeaponSilhouette(root);steel.dispose();polymer.dispose();}
 }
});
