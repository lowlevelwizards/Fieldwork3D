import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
import {ARMOR_PROPORTIONS,ARMOR_VISIBLE_STYLES} from '../src/operator-armor-proportions.ts';
import {garmentContactAnchor} from '../src/operator-garment-contact-surface.ts';
import {fitPack,defaultPackMount} from '../src/operator-backpack-fit.ts';
import {packMountChoices,sharedRigClips} from '../src/operator-equipment-assembly.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {PACK_STYLES} from '../src/operator-backpack-catalog.ts';
const armors=['armor-bare','soft-slick',...ARMOR_VISIBLE_STYLES];
test('BP10R shoulder paths follow the real top and garment edges, not plate depth',()=>{
 for(const armor of armors)for(const rig of ['no-rig','micro-rig','full-chest','alice-lc2'])for(const top of ['combat-shirt','gorka-jacket']){
  const surface=equipmentExterior(armor,rig,top);
  const cloth=garmentContactAnchor(top,5.2);
  for(const sign of [-1,1]){
   const contact=surface.shoulderContour(sign,4.5,1.5,.32);
   assert.ok(Math.abs(contact.rear[0]-cloth.back)<=.13);
   assert.ok(Math.abs(contact.front[0]-cloth.front)<=.13);
   assert.ok(contact.crown[1]-.16>=cloth.topY-.04);
   const spec=ARMOR_PROPORTIONS[armor];
   const max=cloth.topY+.45+(spec?.strapThickness??0)*.52+.30+.16;
   assert.ok(contact.crown[1]<=max+.02,armor+' '+rig+' raised shoulder');
   assert.ok(contact.front[1]<=contact.crown[1]&&contact.rear[1]<=contact.crown[1]);
   assert.ok(Math.abs(contact.crown[2])+1.5*.5<cloth.side);
  }
 }
});
test('BP10R all pack variants, shared connectors and compact rear seats',()=>{
 for(const armor of armors)for(const style of PACK_STYLES.filter(x=>x!=='no-pack'))for(const rig of ['no-rig','full-chest','chest-placard']){
  for(const mode of packMountChoices(style,armor,rig)){
   const fit=fitPack(style,armor,rig,'combat-shirt',undefined,mode,'padded-belt');
   const surface=equipmentExterior(armor,rig,'combat-shirt');
   const spec=defaultPackMount(style);
   assert.ok(fit.compatible);
   assert.ok(fit.center[0]+spec.bodyFaceX<=surface.back(spec.centerY,0)+1e-7);
   assert.ok(surface.back(spec.centerY,0)-(fit.center[0]+spec.bodyFaceX)<.3);
   for(const span of fit.spans)assert.ok([...span.a,...span.b,...span.normal].every(Number.isFinite));
   if(mode==='direct')assert.equal(fit.spans.length,0);
   if(mode==='shared'){
    const frame=rigContactFrame(armor,'combat-shirt',rig);
    for(const sign of [-1,1]){
     const clip=sharedRigClips(frame,sign);
     assert.ok(fit.spans.some(s=>s.b.every((n,i)=>n===clip.upper[i])));
     assert.ok(fit.spans.some(s=>s.a.every((n,i)=>n===clip.lower[i])));
    }
   }
   if(style==='field-pack'||style==='rucksack'){
    assert.equal(fit.waistSpans.length,8);
    assert.ok(fit.waistSpans.every(s=>s.a[1]===s.b[1]));
   }
  }
 }
});
