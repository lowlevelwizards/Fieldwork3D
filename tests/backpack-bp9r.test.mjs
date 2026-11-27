import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {packDetailPalette} from '../src/operator-backpack-colors.ts';
import {packGraphicAtlas} from '../src/operator-backpack-graphics.ts';
import {createPackPreview,updatePackPreview,applyPackDetailPalette} from '../src/operator-backpack-preview.ts';
test('seams and webbing respond to dark and light fabric; cached atlas per color',()=>{
 const black=packDetailPalette(0x202020),tan=packDetailPalette(0xc0a880),green=packDetailPalette(0x687455);
 assert.ok(black.seam[0]>32&&tan.seam[0]<192);
 assert.ok(black.webbing[0]<black.seam[0]&&tan.webbing[0]>tan.seam[0]);
 assert.notDeepEqual(tan.seam,green.seam);
 assert.equal(packGraphicAtlas(0x202020),packGraphicAtlas(0x202020));
 assert.notEqual(packGraphicAtlas(0x202020),packGraphicAtlas(0xc0a880));
});
test('recolor authored pack without changing other gear or rebuilding',()=>{
 const m={fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()};
 const parent=new THREE.Group(),chest=new THREE.Group();chest.add(parent);
 const state=createPackPreview(parent,chest,m);
 const art=updatePackPreview(state,true,'day-pack','plate-jpc','no-rig','combat-shirt');
 const ledger=new Map(),original=m.trim.color.getHex();
 applyPackDetailPalette(state,0x202020,ledger);
 const mesh=art.root.getObjectByName('pack-pixel-graphics'),map=mesh.material.map;
 applyPackDetailPalette(state,0xc0a880,ledger);
 assert.notEqual(mesh.material.map,map);assert.equal(m.trim.color.getHex(),original);
 assert.equal(state.active,art);
 assert.equal(ledger.size,2);
});
