import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,WARDROBE_ITEMS,setWardrobeFabricSolid,
 setWardrobeFabricCamo} from '../src/operator-wardrobe-data.ts';
import {GARMENT_SOLID_COLORS} from '../src/operator-garment-color-policy.ts';
import {ARMOR_VISUAL_TEXTILES,armorSignature}
 from '../src/operator-rig-authenticity-policy.ts';
import {fabricCamoCompatible} from '../src/operator-fabric-camo-policy.ts';

const EXPECTED={
 'soft-slick':{solid:'khaki'},
 'soft-vest':{solid:'black'},
 'soft-flak':{solid:'olive-drab'},
 'plate-slick':{solid:'ranger-green'},
 'plate-jpc':{solid:'ranger-green',print:'multicam'},
 'plate-standard':{solid:'coyote'},
 'plate-heavy':{solid:'black'},
 'plate-legacy':{solid:'olive-drab',print:'m81-woodland'}
};
const armorIDs=WARDROBE_ITEMS.filter(x=>x.slot==='armorStyle'&&x.id!=='armor-bare')
 .map(x=>x.id);
const outfit=armor=>({top:'bdu-shirt',trousers:'bdu-trousers',
 armorStyle:armor,rigStyle:'no-rig',packStyle:'no-pack'});
function show(r,armor,wardrobe=initialWardrobe()){
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment:kit,wardrobe:{...wardrobe,styles:{
    ...wardrobe.styles,top:'bdu-shirt',trousers:'bdu-trousers',
    armorStyle:armor,rigStyle:'no-rig',headwear:'bare',
    beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
 return {color:r.colors.get(r.vestMaterial)?.getHex(),
  map:r.vestMaterial.map};
}
test('R8: all eight selectable armor cuts have correct iconic default textile',()=>{
 assert.equal(armorIDs.length,Object.keys(EXPECTED).length);
 assert.deepEqual(new Set(armorIDs),new Set(Object.keys(EXPECTED)));
 for(const [style,signature] of Object.entries(EXPECTED)){
  assert.deepEqual(armorSignature(style),signature);
  assert.ok(ARMOR_VISUAL_TEXTILES[style].solids.includes(signature.solid));
  if(signature.print){
   assert.ok(ARMOR_VISUAL_TEXTILES[style].prints.includes(signature.print));
   assert.ok(fabricCamoCompatible(signature.print,'armor',outfit(style)));
  }
 }
 assert.deepEqual(armorSignature('soft-paca'),{solid:'khaki'},
  'retired PACA alias remains consistent with concealable body armor');
});
test('R8: 3D armor color and print follow EACH chosen armor, not the uniform',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  const baseline=show(r,'soft-vest').map;
  for(const [armor,signature] of Object.entries(EXPECTED)){
   const first=show(r,armor);
   assert.ok(first.map);
   if(signature.print){
    assert.equal(first.color,0xffffff,
     armor+' should render the actual preserved camouflage artwork');
    assert.notEqual(first.map,baseline,
     armor+' should not silently show neutral solid fabric');
   }else{
    assert.equal(first.color,GARMENT_SOLID_COLORS[signature.solid].hex,
     armor+' iconic solid should tint actual armor geometry');
    assert.equal(first.map,baseline,
     armor+' solid uses authored texture, not a fake printed material');
   }
  }
  const returned=show(r,'soft-vest');
  assert.equal(returned.color,GARMENT_SOLID_COLORS.black.hex,
   'switching back restores armor-specific default without accumulating state');
 }finally{r.dispose();}
});
test('R8: manual compatible solid/print overrides win; original default restores',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  const jpc='plate-jpc',legacy='plate-legacy';
  let manual=setWardrobeFabricSolid(initialWardrobe(),
   'armor','ranger-green',outfit(jpc));
  assert.equal(show(r,jpc,manual).color,GARMENT_SOLID_COLORS['ranger-green'].hex,
   'manual JPC solid overrides default MultiCam');
  assert.equal(show(r,jpc).color,0xffffff,
   'clearing manual choice returns to iconic MultiCam');
  manual=setWardrobeFabricCamo(initialWardrobe(),
   'armor','multicam',outfit('plate-standard'));
  assert.equal(show(r,'plate-standard',manual).color,0xffffff,
   'manual carrier print overrides its default Coyote solid');
  assert.equal(show(r,'plate-standard').color,GARMENT_SOLID_COLORS.coyote.hex);
  manual=setWardrobeFabricSolid(initialWardrobe(),
   'armor','olive-drab',outfit(legacy));
  assert.equal(show(r,legacy,manual).color,GARMENT_SOLID_COLORS['olive-drab'].hex,
   'manual OD overrides legacy M81 pattern');
  assert.equal(show(r,legacy).color,0xffffff);
  const stale={...initialWardrobe(),fabricCamo:{armor:'multicam'},
   fabricSolids:{armor:'coyote'}};
  assert.equal(show(r,'soft-slick',stale).color,
   GARMENT_SOLID_COLORS.khaki.hex,
   'incompatible prior print+solid remain stored but do not override new armor');
  assert.equal(show(r,'plate-standard',stale).color,0xffffff,
   'saved valid print reappears on a compatible armor');
 }finally{r.dispose();}
});
