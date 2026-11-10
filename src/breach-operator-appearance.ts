/** Stage 11: visual outfit, gear and wound-color presentation ownership.
 * Caches only appearance fingerprints; never solves motion, fires, moves actors
 * or updates replay/simulation state.
 */
import type {OperatorRig,OperatorPose} from './breach-operator-rig.ts';
import type {OperatorRig,OperatorPose} from './breach-operator-rig.ts';
import * as THREE from 'three';
import {operatorPixelTextures} from './rendering/pixel-materials.ts';
import {equipmentCarrySocket,utilityDisplaySocket} from './equipment-carry-visuals.ts';
import {resolvedWardrobe} from './operator-wardrobe-data.ts';
import {SKIN_TONES,seededSkinTone} from './operator-identity-palette.ts';
import {isH1ModernHelmet,resolveHelmetSetup} from './operator-helmet-setup-policy.ts';
import {headwearSolidHex} from './operator-headwear-colors.ts';
import {resolvedHeadwearCamo,headwearCamoPlacement} from './operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture} from './operator-headwear-materials.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import {wardrobeFabricCamoTexture} from './operator-fabric-camo-materials.ts';
import {headwearCastShadowAtlas,collarCastShadowAtlas,authoredCollarShadowBoxes} from './operator-baked-shadow-maps.ts';
import {resolveAutomaticGearColors} from './operator-gear-color-policy.ts';
import {rigSignature,armorSignature,rigColorAssembly,validRigSolid,validArmorSolid}
 from './operator-rig-authenticity-policy.ts';
import {garmentColorValues,gorkaSpecialtyTexture} from './operator-upper-colorways.ts';
import {garmentSolidHex,isGarmentSolidId,resolvedCuffSolid,resolvedCombatKnitSolid}
 from './operator-garment-color-policy.ts';
import {fabricCamoCompatible,type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {resolveWardrobeDisplayMount} from './operator-wardrobe-mounts.ts';
import {applyOperatorVisualKit} from './operator-visual-kit.ts';
import {updateOperatorEquipmentDetails} from './operator-equipment-details.ts';
const OPERATOR_CLOTH_PALETTE=[0x6f9185,0x80826b,0x8e846e,0x687c8d,
 0x798a79,0x92816a,0x65867c,0x8a8872] as const;
const OPERATOR_VEST_PALETTE=[0x43504b,0x545a47,0x535550,0x46595a,
 0x5a5544,0x415a51,0x636056,0x465354] as const;

type GarmentSegmentCut='full'|'bloused'|'cuffed';
function setSegmentCut(mesh:THREE.Mesh,cut:GarmentSegmentCut){
 const shapes=mesh.userData.garmentSegmentGeometries as
  Record<GarmentSegmentCut,THREE.BoxGeometry>|undefined;
 if(shapes&&mesh.geometry!==shapes[cut])mesh.geometry=shapes[cut];
}


const DOWNED_TINT=new THREE.Color(0x555c57);
/** Outfit, headwear and material maps are static between kit changes.
 * Keep a per-rig snapshot separate from motion/IK, which still runs on
 * every frame. Weak keys release disposed operator preview rigs. */
const appearanceState=new WeakMap<OperatorRig,{
 key:string;downed:boolean;outfit:ReturnType<typeof resolvedWardrobe>
}>();

export function updateOperatorAppearance(r:OperatorRig,p:OperatorPose){
  // Fingerprint only presentation inputs; movement, time and dynamic posing
  // are purposefully excluded. JSON captures in-place Studio edits and
  // magazine / medical inventory changes without depending on object identity.
  const appearanceKey=JSON.stringify([
    p.appearanceSeed??0,p.equipment??null,p.wardrobe??null,
    p.magazineCarryLocations??null,p.medicalCarryLocation??null,
    p.utilityCarryLocation??null,p.faceStyle??null,
    p.flashCharges??null,p.treatmentActive??null,
    p.weaponConfiguration?.build?.parts.magazine??null
  ]);
  r.root.userData.fieldworkLightingAppearanceKey=appearanceKey;
  const previousAppearance=appearanceState.get(r);
  const appearanceChanged=previousAppearance?.key!==appearanceKey;
  // Resolve once per appearance fingerprint, including in-place Studio edits.
  // No repeated wardrobe normalization in coupled, coordinated or IK paths.
  const clothing=appearanceChanged?
    resolvedWardrobe(p.wardrobe,p.equipment):previousAppearance!.outfit;
  if(appearanceChanged){
  // Stable career-based presentation, never changing physical collision or IK.
  const identity=p.appearanceSeed??0;
  if(identity!==r.appearanceSeed){
    r.appearanceSeed=identity;
    const colorKey=identity>>>0;

    r.colors.set(r.clothMaterial,identity===0?r.baseCloth.clone():
      new THREE.Color(OPERATOR_CLOTH_PALETTE[colorKey%OPERATOR_CLOTH_PALETTE.length]));
    r.colors.set(r.vestMaterial,identity===0?r.baseVest.clone():
      new THREE.Color(OPERATOR_VEST_PALETTE[(colorKey-1+OPERATOR_VEST_PALETTE.length)%
        OPERATOR_VEST_PALETTE.length]));
    r.helmetBadge.visible=false;
    r.pack.scale.set(1,identity===0?1:.90+(identity%5)*.05,
      identity===0?1:.93+((identity>>>5)%4)*.04);
  }
  // Explicit identity overrides are cosmetic; legacy rosters retain their
  // exact seeded complexion. Updating each pose also keeps preview edits,
  // replay/seek and reversible downed desaturation consistent.
  const complexion=p.wardrobe?.skinTone??seededSkinTone(identity);
  for(const skinMaterial of [r.skinMaterial,r.faceSkinMaterial,
    r.neckSkinMaterial]){
   const baseline=r.colors.get(skinMaterial);
   if(baseline)baseline.set(SKIN_TONES[complexion].hex);
   else r.colors.set(skinMaterial,new THREE.Color(SKIN_TONES[complexion].hex));
  }
  // Kit presentation reuses the live rig without altering shot transforms.
  const gear=p.equipment?.slots;
  // Legacy rectangles are retained for compatibility but superseded by
  // assembled helmet and garment surfaces.
  for(const mesh of r.helmetShell)mesh.visible=false;
  r.capBill.visible=false;
  r.helmetBadge.visible=false; // superseded by the integrated helmet shell
  const armorItem=gear?.armor??'armor-soft';
  for(const mesh of r.armorPanels){
    mesh.visible=false;
    mesh.scale.x=armorItem==='armor-carrier'?1.16:1;
  }
  const packItem=gear?.backpack??'backpack-day';
  r.pack.visible=packItem!=='backpack-none';
  // Explicit pack geometries already carry different volume; extra scaling
  // used to produce huge square overlapping cubes.
  r.pack.scale.set(1,1,1);
  // Visible compact modules use exactly the configured kit (not free extras).
  const rigItem=gear?.rig??'rig-none';
  const placements=p.magazineCarryLocations??[];
  const rigOccupied=placements.includes('rig');
  const beltOccupied=placements.includes('belt')||
    p.medicalCarryLocation==='belt'||p.utilityCarryLocation==='belt';
  // Generic pouches are fillers ONLY on otherwise empty rigs or belts:
  // never superimpose them on genuine inventory-backed magazine pouches.
  r.rigPouches.forEach((mesh,i)=>{
    mesh.visible=!rigOccupied&&
      (rigItem==='rig-full'||(rigItem==='rig-light'&&i===0));
  });
  r.beltPouch.visible=gear?.belt==='belt-standard'&&!beltOccupied;
  r.medicalPouch.visible=(gear?.medical==='medical-basic'||
    gear?.medical==='medical-trauma')&&!p.treatmentActive;
  r.medicalPouch.scale.set(gear?.medical==='medical-trauma'?1.35:1,1,1);
  // Use actual carrier locations instead of rendering every pouch on chest.
  const medicalAnchor=resolveWardrobeDisplayMount(
    'medical',p.medicalCarryLocation??'rig',p.wardrobe?.mounts?.medical,
    gear?.medical??'medical-none',packItem!=='backpack-none')??
   equipmentCarrySocket('medical',p.medicalCarryLocation);
  const medicalParent=medicalAnchor.bone==='hip'?r.hip:
    medicalAnchor.bone==='pack'?r.pack:r.chest;
  if(r.medicalPouch.parent!==medicalParent)medicalParent.add(r.medicalPouch);
  r.medicalPouch.position.set(medicalAnchor.x,medicalAnchor.y,medicalAnchor.z);
  r.medicalPouch.rotation.z=medicalAnchor.angle;
  r.radioUnit.visible=gear?.utility==='utility-radio';
  r.utilityTool.visible=['utility-light','utility-breach','utility-pry',
    'utility-cutter','utility-wedge'].includes(gear?.utility??'');
  const utilityAnchor=resolveWardrobeDisplayMount(
    'utility',p.utilityCarryLocation??'rig',p.wardrobe?.mounts?.utility,
    gear?.utility??'utility-none',packItem!=='backpack-none')??
    utilityDisplaySocket(gear?.utility??'utility-none',
    p.utilityCarryLocation,packItem!=='backpack-none');
  const utilityParent=utilityAnchor.bone==='hip'?r.hip:
    utilityAnchor.bone==='pack'?r.pack:r.chest;
  // Small radios retain their ledger position; large tools use a rear-facing
  // visual socket to clear the moving thigh without changing access mechanics.
  const radioAnchor=equipmentCarrySocket('utility',p.utilityCarryLocation);
  const radioParent=radioAnchor.bone==='hip'?r.hip:
    radioAnchor.bone==='pack'?r.pack:r.chest;
  if(r.radioUnit.parent!==radioParent)radioParent.add(r.radioUnit);
  r.radioUnit.position.set(radioAnchor.x,radioAnchor.y+2,radioAnchor.z);
  r.radioUnit.rotation.z=radioAnchor.angle;
  if(r.utilityTool.parent!==utilityParent)utilityParent.add(r.utilityTool);
  r.utilityTool.position.set(utilityAnchor.x,utilityAnchor.y,utilityAnchor.z);
  r.utilityTool.rotation.z=utilityAnchor.angle;
  r.utilityTool.scale.set(
    gear?.utility==='utility-breach'?1.45:
    gear?.utility==='utility-light'?.72:1,
    gear?.utility==='utility-breach'?1.2:
    gear?.utility==='utility-cutter'?1.25:1,
    1);
  r.flashCanister.visible=gear?.tactical==='tactical-smoke'||
    (gear?.tactical==='tactical-flash'&&
      (p.flashCharges===undefined||p.flashCharges>0));
  for(const glove of r.gloveCovers)glove.visible=gear?.hands==='hands-gloves';
  applyOperatorVisualKit(r.visualKit,gear,identity,
    p.magazineCarryLocations,p.faceStyle,p.wardrobe,p.weaponConfiguration);
  r.colors.set(r.visualKit.carriedMagazineMaterial,
    r.visualKit.carriedMagazineMaterial.color.clone());
  // D2-R4A: accessory swatches are applied by the reusable visual kit.
  // Sync its recolorable materials into the authoritative color ledger before
  // final pose restoration/desaturation (which otherwise erases Studio edits).
  const headLayers=r.visualKit.wardrobeHead;
  for(const material of [
    headLayers.faceFabric,headLayers.maskRubber,
    headLayers.eyewearFrame,headLayers.eyewearLens
  ])r.colors.set(material,material.color.clone());
  // Clothing coverage changes materials on existing articulated limbs only.
  // The bones, solved knee/elbow positions and planted feet stay identical.
  const sleeveState=p.wardrobe?.sleeveState??'unrolled';
  const bareForearm=clothing.top==='base-layer'||
    (sleeveState==='rolled'||sleeveState==='cuffed');
  for(const arm of r.arms){
   // Rolled sleeves retain the FULL shoulder-to-elbow cuboid. Only the
   // forearm becomes bare skin and a fabric roll wraps the elbow end.
   // Never shorten the upper-arm mesh: that erased the visible elbow.
   setSegmentCut(arm.upper,'full');
   const sleeveMaterial=clothing.top==='gorka-jacket'?
    r.visualKit.newUpper.mountainCanvas:r.clothMaterial;
   arm.lower.material=bareForearm?r.skinMaterial:sleeveMaterial;
   arm.upper.material=clothing.top==='base-layer'?
    r.skinMaterial:sleeveMaterial;
  }
  for(const leg of r.feet){
   const hem=p.wardrobe?.trouserHem??'bloused';
   const shortHem=hem==='bloused'||hem==='cuffed';
   setSegmentCut(leg.lower,clothing.trousers==='base-shorts'||hem==='unbloused'?'full':hem);
   const shaft=leg.lower.userData.garmentBootShaft as THREE.Mesh|undefined;
   if(shaft)shaft.visible=shortHem&&clothing.footwear!=='bare-feet';
   leg.lower.material=clothing.trousers==='base-shorts'?
    r.skinMaterial:r.trouserMaterial;
   const barefoot=clothing.footwear==='bare-feet';
   leg.shoe.material=barefoot?r.skinMaterial:r.bootMaterial;
   leg.shoe.scale.set(1,barefoot?.7:1,barefoot?.88:1);
  }
  // Independent fabric channels keep the upper garment, trousers, armor and
  // pack textures separate while retaining the original authored pixel UVs.
  const fabricChannels=[
   ['top',r.clothMaterial],
   ['trousers',r.trouserMaterial],
   ['armor',r.vestMaterial],
   ['pack',r.packMaterial],
   ['gear',r.gearMaterial],
   ['head',r.headClothMaterial],
   ['head',r.headArmorMaterial]
  ] as const;
  // Reset each textile to its own actor-identity neutral color on EVERY pose.
  // Previously trousers inherited the last color stored for the torso, so
  // changing only the jacket could recolor pants on the next Studio refresh.
  const colorKey=identity>>>0;
  const defaultCloth=identity===0?r.baseCloth.clone():
   new THREE.Color(OPERATOR_CLOTH_PALETTE[colorKey%OPERATOR_CLOTH_PALETTE.length]);
  const defaultVest=identity===0?r.baseVest.clone():
   new THREE.Color(OPERATOR_VEST_PALETTE[
    (colorKey-1+OPERATOR_VEST_PALETTE.length)%OPERATOR_VEST_PALETTE.length]);
  r.colors.set(r.clothMaterial,defaultCloth.clone());
  r.colors.set(r.trouserMaterial,defaultCloth.clone());
  r.colors.set(r.vestMaterial,defaultVest.clone());
  r.colors.set(r.packMaterial,defaultVest.clone());
  r.colors.set(r.gearMaterial,defaultVest.clone());
  r.colors.set(r.headArmorMaterial,defaultVest.clone());
  r.colors.set(r.headClothMaterial,defaultCloth.clone());
  const selectedTopPrint=p.wardrobe?.fabricCamo?.top;
  const outfitTopPrint=selectedTopPrint&&
   fabricCamoCompatible(selectedTopPrint,'top',clothing)?selectedTopPrint:null;
  const automaticGear=resolveAutomaticGearColors({
   print:outfitTopPrint,solid:p.wardrobe?.fabricSolids?.top
  });
  const signature=rigSignature(clothing.rigStyle);
  const armorDefault=armorSignature(clothing.armorStyle);
  for(const [channel,material] of fabricChannels){
   const authored=channel==='head'?null:
    p.wardrobe?.fabricCamo?.[channel as FabricCamoChannel];
   const approvedManual=authored&&channel!=='head'&&
    fabricCamoCompatible(authored,channel as FabricCamoChannel,clothing)?
     authored:null;
   const storedSolid=channel==='head'?null:
    p.wardrobe?.fabricSolids?.[channel as FabricCamoChannel];
   const validManualSolid=isGarmentSolidId(storedSolid)&&(
    channel==='gear'?(clothing.rigStyle==='no-rig'||
     validRigSolid(clothing.rigStyle,storedSolid)):
    channel==='armor'?validArmorSolid(clothing.armorStyle,storedSolid):true
   )?storedSolid:null;
   // A model's iconic textile applies only while the specific channel
   // has no *valid* manual color or print. Stale, incompatible saved
   // choices stay stored for later, but don't obscure another armor default.
   const iconicPrint=p.wardrobe&&!approvedManual&&!validManualSolid?
    channel==='gear'&&clothing.rigStyle!=='no-rig'?signature.print:
    channel==='armor'&&clothing.armorStyle!=='armor-bare'?
     armorDefault.print:null:null;
   const print=approvedManual??(iconicPrint&&
    fabricCamoCompatible(iconicPrint,channel as FabricCamoChannel,clothing)?
     iconicPrint:null);
   const map=print?
    wardrobeFabricCamoTexture(print,channel as FabricCamoChannel,
     headwearCamoPlacement(r.camoIdentity,'garment:'+channel,print,
      p.wardrobe?.fabricCamoRoll?.[channel as FabricCamoChannel]??0)):
    operatorPixelTextures.get('fabric');
   if(material.map!==map){material.map=map;material.needsUpdate=true;}
   if(print)r.colors.set(material,new THREE.Color(0xffffff));
   else if(channel!=='head'){
    if(validManualSolid)
     r.colors.set(material,new THREE.Color(garmentSolidHex(validManualSolid)));
    else if(p.wardrobe&&(
      channel==='armor'||channel==='gear'||channel==='pack')){
     // Each named rig and armor shell gets its own iconic visual fabric;
     // packs and other channels still follow the uniform-family match.
     const id=channel==='gear'&&clothing.rigStyle!=='no-rig'?
      signature.solid:
      channel==='armor'&&clothing.armorStyle!=='armor-bare'?
       armorDefault.solid:automaticGear[channel];
     r.colors.set(material,new THREE.Color(garmentSolidHex(id)));
    }
   }
  }
  // A rig's empty pouch geometry is its own textile. By default it
  // inherits the rig's entire chosen solid/print and deterministic camo cut.
  // Advanced single-color pouch overrides change nothing about rig backing,
  // armor, functional magazines or carrying capacity.
  const assembly=rigColorAssembly(clothing.rigStyle);
  const printForRig=p.wardrobe?.fabricCamo?.gear&&
   fabricCamoCompatible(p.wardrobe.fabricCamo.gear,'gear',clothing)?
   p.wardrobe.fabricCamo.gear:
   p.wardrobe&&!p.wardrobe.fabricSolids?.gear?signature.print:null;
  const pouchMaterial=r.visualKit.wardrobeGear.pouchMaterial;
  const pouchOverride=p.wardrobe?.pouchSolid;
  const pouchHasOverride=assembly.detachablePouches&&
   isGarmentSolidId(pouchOverride)&&validRigSolid(clothing.rigStyle,pouchOverride);
  const pouchMap=pouchHasOverride?operatorPixelTextures.get('fabric'):
   r.gearMaterial.map;
  if(pouchMaterial.map!==pouchMap){
   pouchMaterial.map=pouchMap;pouchMaterial.needsUpdate=true;
  }
  r.colors.set(pouchMaterial,pouchHasOverride?
   new THREE.Color(garmentSolidHex(pouchOverride)):
   (r.colors.get(r.gearMaterial)??r.gearMaterial.color).clone());
  // Structural straps are textile, not permanent OD or fixed gray trim.
  // Only replaceable harnesses offer an additional manual material.
  const strapMaterial=r.visualKit.wardrobeGear.strapMaterial;
  const strapOverride=p.wardrobe?.strapSolid;
  const strapHasOverride=assembly.replaceableHarness&&
   isGarmentSolidId(strapOverride)&&validRigSolid(clothing.rigStyle,strapOverride);
  const plainWebbing=assembly.webbing==='solid-when-printed'&&!!printForRig;
  const strapMap=strapHasOverride||plainWebbing?
   operatorPixelTextures.get('fabric'):r.gearMaterial.map;
  if(strapMaterial.map!==strapMap){
   strapMaterial.map=strapMap;strapMaterial.needsUpdate=true;
  }
  const strapHex=strapHasOverride?garmentSolidHex(strapOverride):
   plainWebbing?garmentSolidHex(
    resolveAutomaticGearColors({print:printForRig}).gear):null;
  r.colors.set(strapMaterial,strapHex===null?
   (r.colors.get(r.gearMaterial)??r.gearMaterial.color).clone():
   new THREE.Color(strapHex));
  // One authoritative color ledger owns *every* material before the final
  // pose-time restore and optional injury desaturation. In particular, do not
  // overwrite the selected headgear swatch with the old neutral blend.
  // Its grayscale construction atlas and physical finish stay independent.
  const finish=garmentColorValues(clothing.top,
    p.wardrobe?.topColorway??'standard');
  const additional=r.visualKit.newUpper;
  const topPrint=p.wardrobe?.fabricCamo?.top;
  const validTopPrint=topPrint&&fabricCamoCompatible(topPrint,'top',clothing)?topPrint:null;
  // Combat knit is derived from the actual outer fabric family unless an
  // explicitly retained advanced override was selected.
  const knit=resolvedCombatKnitSolid({
   print:validTopPrint,solid:p.wardrobe?.fabricSolids?.top,
   override:p.wardrobe?.knitSolid,fallback:'khaki'
  });
  r.colors.set(additional.combatKnit,new THREE.Color(garmentSolidHex(knit)));
  const cuff=resolvedCuffSolid({
   print:validTopPrint,
   solid:p.wardrobe?.fabricSolids?.top,
   override:p.wardrobe?.cuffSolid,
   fallback:clothing.top==='gorka-jacket'?'khaki':'olive-drab'
  });
  const cuffHex=garmentSolidHex(cuff);
  r.colors.set(additional.smockCuff,new THREE.Color(cuffHex));
  r.colors.set(additional.gorkaCuff,new THREE.Color(cuffHex));
  r.colors.set(r.visualKit.fieldBlouses['bdu-shirt'].cuffMaterial,
   new THREE.Color(cuffHex));
  // Trouser rolls use the SAME deliberate cuff-solid policy as sleeves,
  // but resolve against trousers, never the jacket's selected fabric.
  // A user-selected cuff swatch deliberately overrides both channels.
  const legPrint=p.wardrobe?.fabricCamo?.trousers;
  const trouserCuff=resolvedCuffSolid({
   print:legPrint&&fabricCamoCompatible(legPrint,'trousers',clothing)?legPrint:null,
   solid:p.wardrobe?.fabricSolids?.trousers,
   override:p.wardrobe?.cuffSolid,
   fallback:clothing.trousers==='gorka-trousers'?'khaki':'olive-drab'
  });
  r.colors.set(r.visualKit.fieldTrousers['bdu-trousers'].cuffMaterial,
   new THREE.Color(garmentSolidHex(trouserCuff)));
  // The upper and lower Gorka pieces are separate clothing channels. In
  // particular a jacket two-tone choice must never recolor the trousers.
  const selectedTop=p.wardrobe?.fabricCamo?.top;
  const hasAuthoredTop=!!selectedTop&&
    fabricCamoCompatible(selectedTop,'top',clothing);
  const topSolid=p.wardrobe?.fabricSolids?.top;
  const topBaseColor=hasAuthoredTop?0xffffff:
    isGarmentSolidId(topSolid)?garmentSolidHex(topSolid):finish.gorkaBase;
  r.colors.set(additional.mountainCanvas,new THREE.Color(topBaseColor));
  const topCanvasMap=hasAuthoredTop?r.clothMaterial.map:
    operatorPixelTextures.get('fabric');
  if(additional.mountainCanvas.map!==topCanvasMap){
   additional.mountainCanvas.map=topCanvasMap;
   additional.mountainCanvas.needsUpdate=true;
  }
  const panelMap=finish.specialty?
     gorkaSpecialtyTexture(finish.specialty):
     hasAuthoredTop?r.clothMaterial.map:operatorPixelTextures.get('fabric');
  if(additional.mountainPanel.map!==panelMap){
   additional.mountainPanel.map=panelMap;
   additional.mountainPanel.needsUpdate=true;
  }
  r.colors.set(additional.mountainPanel,new THREE.Color(
    finish.specialty||hasAuthoredTop?0xffffff:finish.gorkaPanel));
  const selectedLeg=p.wardrobe?.fabricCamo?.trousers;
  const hasAuthoredLeg=!!selectedLeg&&
    fabricCamoCompatible(selectedLeg,'trousers',clothing);
  const legSolid=p.wardrobe?.fabricSolids?.trousers;
  const legDefaults=garmentColorValues('gorka-jacket','standard');
  const legBaseColor=hasAuthoredLeg?0xffffff:
    isGarmentSolidId(legSolid)?garmentSolidHex(legSolid):legDefaults.gorkaBase;
  r.colors.set(additional.mountainLegCanvas,new THREE.Color(legBaseColor));
  const legMap=hasAuthoredLeg?r.trouserMaterial.map:operatorPixelTextures.get('fabric');
  if(additional.mountainLegCanvas.map!==legMap){
   additional.mountainLegCanvas.map=legMap;
   additional.mountainLegCanvas.needsUpdate=true;
  }
  if(additional.mountainLegPanel.map!==legMap){
   additional.mountainLegPanel.map=legMap;
   additional.mountainLegPanel.needsUpdate=true;
  }
  r.colors.set(additional.mountainLegPanel,new THREE.Color(
    hasAuthoredLeg?0xffffff:
     isGarmentSolidId(legSolid)?garmentSolidHex(legSolid):legDefaults.gorkaPanel));
  if(clothing.top==='smock-jacket'&&!hasAuthoredTop&&
     !p.wardrobe?.fabricSolids?.top)
    r.colors.set(r.clothMaterial,new THREE.Color(finish.smock));
  // Directional shadows are traced once from the actual hat and jacket
  // volumes into tiny receiver atlases; color changes reuse cached bakes.
  const headShadow=headwearCastShadowAtlas(clothing.headwear);
  if(r.faceSkinMaterial.map!==headShadow){
   r.faceSkinMaterial.map=headShadow;r.faceSkinMaterial.needsUpdate=true;
  }
  const collarGroup=(clothing.top==='bdu-shirt'||clothing.top==='acu-shirt')?
   r.visualKit.fieldBlouses[clothing.top].torso:
   (clothing.top==='combat-shirt'||clothing.top==='smock-jacket'||
    clothing.top==='gorka-jacket')?
    r.visualKit.newUpper.cuts[clothing.top].torso:null;
  const collarShadow=collarCastShadowAtlas(
   clothing.top+'|'+clothing.armorStyle,
   collarGroup?authoredCollarShadowBoxes(collarGroup,r.chest):[]);
  if(r.neckSkinMaterial.map!==collarShadow){
   r.neckSkinMaterial.map=collarShadow;r.neckSkinMaterial.needsUpdate=true;
  }
  for(const [id,material] of Object.entries(r.visualKit.wardrobeHead.headwearMaterials)){
   const selected=id===clothing.headwear;
   const modelId=(id==='high-cut-rails'?'high-cut':id) as HeadSilhouetteId;
   const requestedCamo=selected&&p.wardrobe?.headwearCamo!=='splittertarn-31'?
     resolvedHeadwearCamo(modelId,p.wardrobe?.headwearCamo):null;
   // Modern printed helmets carry actual cloth covers; preserve the
   // independent shell material beneath them, as on main.
   const fabricOnShell=isH1ModernHelmet(modelId)&&
     resolveHelmetSetup(modelId,p.wardrobe?.helmetSetup,{
      hasLegacyPrint:!!requestedCamo
     }).setup.cover!=='none';
   // A PASGT never prints camouflage directly on the Kevlar shell.
   // With its cloth cover removed, the independent hard-shell solid shows.
   const camo=modelId==='pasgt'||fabricOnShell?null:requestedCamo;
   const map=camo?headwearCamoTexture(modelId,camo,
     headwearCamoPlacement(r.camoIdentity,'headwear:'+modelId,camo,
      p.wardrobe?.headwearCamoRoll??0)):headwearDetailTexture(modelId);
   if(material.map!==map){material.map=map;material.needsUpdate=true;}
   // Subtle baked AO now remains enabled for solids and printed helmets.
   // No vertex-color shader toggle or recompile on camo changes.
   if(camo){
    // Chromatic artwork lives in the map; white avoids a second tint.
    // The pose-time ledger still owns desaturation and replay.
    r.colors.set(material,new THREE.Color(0xffffff));
    continue;
   }
   const solid=selected?headwearSolidHex(
     modelId,p.wardrobe?.headwearColor):null;
   if(solid!==null){
    r.colors.set(material,new THREE.Color(solid));
    continue;
   }
   // Unselected variants remain neutral; they cannot inherit the last
   // inspected item's swatch when another hat/helmet is equipped.
   const soft=['patrol-cap','boonie','beanie','beret'].includes(id);
   const source=r.colors.get(soft?r.headClothMaterial:r.headArmorMaterial);
   const chosen=(source??new THREE.Color(0x899089)).clone();
   r.colors.set(material,new THREE.Color(0x899089).lerp(chosen,.38));
  }
  // Hair is seeded by the costume assembler and must join the same reversible
  // palette ledger used by replay, silhouette mode and injury desaturation.
  r.colors.set(r.visualKit.hairMaterial,r.visualKit.hairMaterial.color.clone());
  r.colors.set(r.visualKit.patchMaterial,r.visualKit.patchMaterial.color.clone());
  updateOperatorEquipmentDetails(r.equipmentDetails,gear);
  }
  // Desaturation changes only at injury/surrender transitions, not each
  // animation frame. Replayed appearance or kit changes refresh the palette.
  const downed=p.down&&!p.surrender;
  if(appearanceChanged||previousAppearance?.downed!==downed){
    for(const [material,original] of r.colors){
      material.color.copy(original);
      if(downed)material.color.lerp(DOWNED_TINT,.46);
    }
  }
  if(previousAppearance){
    previousAppearance.key=appearanceKey;
    previousAppearance.downed=downed;
    previousAppearance.outfit=clothing;
  }else appearanceState.set(r,{key:appearanceKey,downed,outfit:clothing});

 return clothing;
}
