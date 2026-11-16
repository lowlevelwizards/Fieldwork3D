import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {hireRecruit,setCampaignWardrobe,readCampaign} from '../src/campaign-state.ts';
import {resolveFactionReference} from '../src/faction-reference-resolver.ts';
import {headwearSolidHex,HEADWEAR_SOLID_COLORS}
 from '../src/operator-headwear-colors.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe,wardrobeItem}
 from '../src/operator-wardrobe-data.ts';
import {dispatchPilotAppearanceAllowed}
 from '../src/dispatch-pilot-appearance.ts';

test('D7 closeout: actual SWAT starters and recruits keep a black MICH high-cut with issued soft armor and SWAT marking',()=>{
 const resolved=resolveFactionReference('us-swat-2015');
 assert.deepEqual(resolved.technicalIssues,[]);
 const c=hireRecruit(newDispatchPilotCampaign(717));
 assert.equal(c.operators.length,5);
 for(const person of c.operators){
  const w=person.wardrobe;
  const look=resolvedWardrobe(w,person.loadout);
  assert.equal(look.headwear,'mich-2001');
  assert.equal(w.headwearColor,'black');
  assert.equal(headwearSolidHex(look.headwear,w.headwearColor),HEADWEAR_SOLID_COLORS.black.hex);
  assert.equal(look.top,'bdu-shirt');
  assert.equal(look.trousers,'bdu-trousers');
  assert.equal(look.armorStyle,'soft-vest');
  assert.equal(look.rigStyle,'micro-rig');
  assert.equal(w.markings?.chest,'label-swat');
  assert.equal(person.loadout.slots.head,'head-helmet');
  assert.equal(person.loadout.slots.armor,'armor-soft');
 }
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});

test('D7 closeout: real lazy gameplay and eager Studio head assemblers both select the existing high-cut shell',()=>{
 const w=resolveFactionReference('us-swat-2015').wardrobe;
 for(const lazy of [true,false]){
  const head=new THREE.Group(),canonical=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x676c64});
  const layers=createWardrobeHeadLayers(head,canonical,mat,mat,mat,mat,lazy);
  assert.equal(layers.headwear['police-helmet'],undefined);
  updateWardrobeHeadLayers(layers,w.styles.headwear,w.styles.facewear,
   w.styles.eyewear,w.styles.headset,
   undefined,undefined,undefined,undefined,'right',w);
  const shell=layers.headwear['mich-2001'];
  assert.ok(shell,'real high-cut helmet model exists');
  assert.equal(shell.visible,true);
  assert.ok(shell.children.length>0,'selected shell is built in both paths');
  assert.equal(layers.headwear.pasgt.visible,false);
 }
});

test('D7 closeout: saved legacy police helmet/visor cannot restore removed geometry',()=>{
 const base=initialWardrobe();
 const legacy={...base,styles:{...base.styles,headwear:'police-helmet'},
  headwearColor:'black',policeVisorPosition:'lowered'};
 const converted=readWardrobe(legacy);
 assert.equal(converted.styles.headwear,'mich-2001');
 assert.equal(converted.headwearColor,'black');
 assert.equal(wardrobeItem('headwear','police-helmet'),undefined);
 assert.deepEqual(readWardrobe(converted),converted);
 const head=new THREE.Group(),canonical=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:0x676c64});
 const layers=createWardrobeHeadLayers(head,canonical,mat,mat,mat,mat,true);
 updateWardrobeHeadLayers(layers,converted.styles.headwear,
  converted.styles.facewear,converted.styles.eyewear,
  converted.styles.headset,undefined,undefined,undefined,
  undefined,'right',converted);
 assert.equal(layers.headwear['police-helmet'],undefined);
 assert.equal(layers.headwear['mich-2001'].visible,true);
});

test('D7 closeout: D6 dark-uniform customization preserves helmet and issued armor',()=>{
 const base=newDispatchPilotCampaign(718);
 const p=base.operators[0];
 const update={...p.wardrobe,gloveSolid:'charcoal',
  fabricSolids:{...p.wardrobe.fabricSolids,top:'navy',trousers:'charcoal'}};
 assert.equal(dispatchPilotAppearanceAllowed(p.wardrobe,update,p.loadout),true);
 const changed=setCampaignWardrobe(base,p.id,update);
 assert.notStrictEqual(changed,base);
 const w=changed.operators[0].wardrobe;
 assert.equal(w.styles.headwear,'mich-2001');
 assert.equal(w.headwearColor,'black');
 assert.equal(w.fabricSolids.top,'navy');
 assert.equal(w.fabricSolids.trousers,'charcoal');
 assert.equal(w.markings?.chest,'label-swat');
 assert.deepEqual(changed.operators[0].loadout,p.loadout);
 assert.deepEqual(readCampaign(JSON.stringify(changed)),changed);
});
