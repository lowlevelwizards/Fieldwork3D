import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {UPPER_CUT_PROFILES} from '../src/operator-new-upper-garments.ts';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('field smock and mountain Gorka carry two distinctly different volumes',()=>{
 const smock=UPPER_CUT_PROFILES['smock-jacket'].rings;
 const gorka=UPPER_CUT_PROFILES['gorka-jacket'].rings;
 const knit=UPPER_CUT_PROFILES['combat-shirt'].rings;
 assert.ok(smock.at(-1).y<gorka.at(-1).y-1,
  'smock has the visually longer field hem');
 assert.ok(smock.at(-1).side>smock[2].side+.2,
  'smock lower hem opens outward');
 assert.ok(gorka[3].side<gorka[1].side-.5,
  'mountain garment genuinely cinches at waist');
 assert.ok(gorka.at(-1).side<smock.at(-1).side-.45,
  'Gorka is not a second smock or juggernaut');
 assert.ok(smock[1].side<8.3&&gorka[1].side<8.3,
  'shoulders remain proportionate to the approved operator body');
 assert.ok(knit[1].side<smock[1].side);
 const src=source('../src/operator-new-upper-garments.ts');
 assert.match(src,/for\(const y of \[2\.18,-5\.34\]\)/,
  'smock has both chest and hip pocket rows');
 assert.match(src,/box\(torso,wear,6\.18,4\.56/,
  'Gorka yokes use shallow contrasting sewn cloth');
});
test('clothes-only inspection removes medical, flash and utility props as well as carriers',()=>{
 for(const path of ['../src/operator-studio.ts',
   '../src/operator-appearance-grid.ts']){
  const src=source(path);
  for(const id of ['head-none','armor-none','rig-none','belt-none',
   'backpack-none','medical-none','tactical-none','utility-none'])
   assert.ok(src.includes("'"+id+"'"),path+' must omit '+id+' in clothes mode');
 }
});
test('four garment cuts preserve finite geometry across representative animation modes',()=>{
 const r=createOperatorRig('rook','blue'),kit=initialEquipmentLoadout();
 for(const top of ['combat-shirt','acu-shirt','smock-jacket','gorka-jacket']){
  const styles={top,trousers:top==='gorka-jacket'?'gorka-trousers':
   top==='acu-shirt'?'acu-trousers':'bdu-trousers'};
  for(const phase of [
   {posture:'stand',seconds:0,velocity:0},
   {posture:'crouch',seconds:.5,velocity:0},
   {posture:'stand',seconds:1,velocity:16,stride:7},
   {posture:'stand',seconds:1.5,aiming:true},
   {posture:'stand',seconds:2,reload:.5,reloadDuration:2},
   {posture:'stand',seconds:2.5,down:true,downProgress:.7}
  ]){
   poseOperator(r,{
    x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    unarmedPreview:true,equipment:kit,
    wardrobe:{...initialWardrobe(),styles},...phase
   },.07);
   r.root.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(r.root);
   for(const n of [...box.min.toArray(),...box.max.toArray()])
    assert.ok(Number.isFinite(n),top+' posture '+phase.seconds);
   assert.ok(box.max.y>box.min.y);
  }
 }
 r.dispose();
});
