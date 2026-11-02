import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {WARDROBE_RECIPES,applyWardrobeRecipe} from '../src/operator-wardrobe-recipes.ts';
import {resolvedWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true};
test('full role and faction wardrobe matrix uses one head, armor and backpack',()=>{
 const r=createOperatorRig('rook','blue');
 const footGeometry=r.feet.map(f=>f.upper.geometry);
 const handGeometry=r.arms.map(a=>a.hand.geometry);
 for(const recipe of WARDROBE_RECIPES){
  const {kit,wardrobe}=applyWardrobeRecipe(recipe);
  assert.deepEqual(wardrobeConflicts(wardrobe,kit),[],recipe.id);
  poseOperator(r,{...base,equipment:kit,wardrobe,weapon:recipe.weapon,
   appearanceSeed:13},0);
  const head=resolvedWardrobe(wardrobe,kit).headwear;
  const shown=Object.entries(r.visualKit.wardrobeHead.headwear)
   .filter(([,model])=>model.visible).map(([name])=>name);
  assert.deepEqual(shown,head==='bare'?[]:[head],recipe.id);
  assert.equal(Number(r.visualKit.softArmor.visible)+
    Number(r.visualKit.plateCarrier.visible),kit.slots.armor==='armor-none'?0:1);
  assert.equal(Number(r.visualKit.dayPack.visible)+
    Number(r.visualKit.fieldPack.visible),kit.slots.backpack==='backpack-none'?0:1);
  assert.ok(r.feet.every((foot,i)=>foot.upper.geometry===footGeometry[i]));
  assert.ok(r.arms.every((arm,i)=>arm.hand.geometry===handGeometry[i]));
  assert.ok([...r.root.children].every(o=>o.position.toArray().every(Number.isFinite)));
 }
 r.dispose();
});
