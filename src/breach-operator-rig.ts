/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {CORE_TORSO_CONTACT} from './operator-garment-contact-surface.ts';
import {operatorPixelTextures,type PixelSurface} from './rendering/pixel-materials.ts';
import {canonicalRootOrientation,LEGACY_FRAME_YAW,
  createCanonicalAttachment} from './operator-axis-convention.ts';
import {neutralMannequinHipRise,neutralMannequinWrist,
 neutralMannequinElbowPole} from './operator-mannequin-pose.ts';
import {alignSegment,solveTwoBone,ARM_LIMITS,LEG_LIMITS,
  intersectsTorso} from './breach-ik.ts';
import {armorArmIntrusion,armorElbowPole}
 from './breach-arm-armor-clearance.ts';
import {idleLifeAt} from './breach-idle-life.ts';
import {lowReadyFamilyFit,lowReadyElbowPole}
 from './breach-low-ready-family-fit.ts';
import {solveCoupledLowReady,type CoupledLowReadySolution}
 from './breach-coupled-low-ready.ts';
import {poseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import {interpolateWeaponCarry,lowReadyBlendPhase}
 from './breach-low-ready-transition.ts';
import {createOperatorPoseScratch,type OperatorPoseScratch}
  from './breach-operator-pose-scratch.ts';
import type {WeaponId} from './breach-combat.ts';
import {advanceFootsteps,createFootstepScheduler,validatedReplayFeet,
  type FootstepScheduler,type FootTarget,type FootstepInput}
  from './breach-footsteps.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {packInertia} from './breach-gear-inertia.ts';
import {BOOT_FOREFOOT_OFFSET} from './breach-gait-geometry.ts';
import {operatorMotionTraits} from './breach-operator-personality.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
import {turnHierarchy} from './breach-turn-hierarchy.ts';
import {contactReaction,type BashRole} from './breach-contact-reactions.ts';
import {kickMotion} from './breach-door-actions.ts';
import {reloadPhase,type ReloadMode} from './breach-magazines.ts';
import {reloadHandKey,reloadHandChestTarget} from './breach-reload-motion.ts';
import {choreographV3ReloadHand} from './breach-pose-v3-reload-choreography.ts';
import {choreographV3ReloadWeapon} from './breach-pose-v3-reload-weapon.ts';
import {resolvePoseContactOwners} from './breach-pose-v3-contacts.ts';
import {chooseTorsoAssist} from './breach-pose-v3-body-assist.ts';
import {solveV3DynamicArm} from './breach-pose-v3-dynamic-arm.ts';
import {chooseV3SupportGrip} from './breach-pose-v3-support-grip.ts';
import {solveV3CoordinatedPose} from './breach-pose-v3-coordinated.ts';
import {ANATOMY,elbowCorridor} from './breach-anatomy.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import {blendedHandlingProfile,smoothHandling,type HandlingTransition}
  from './breach-handling-transition.ts';
import {fallAngles,hitStagger,type FallPose,type WoundRegion}
  from './breach-wounds.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {equipmentCarrySocket,utilityDisplaySocket} from './equipment-carry-visuals.ts';
import {resolvedWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import {SKIN_TONES,seededSkinTone} from './operator-identity-palette.ts';
import {headwearSolidHex} from './operator-headwear-colors.ts';
import {resolvedHeadwearCamo,headwearCamoPlacement} from './operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture} from './operator-headwear-materials.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import {garmentBoxUV,wardrobeFabricCamoTexture} from './operator-fabric-camo-materials.ts';
import {enableBakedGearAO} from './operator-baked-gear-ao.ts';
import {createOperatorPoseCavity,updateOperatorPoseCavity,
 type OperatorPoseCavity} from './operator-pose-cavity-lighting.ts';
import {mapSkinReceiverAtlas,headwearCastShadowAtlas,collarCastShadowAtlas,
 authoredCollarShadowBoxes} from './operator-baked-shadow-maps.ts';
import {resolveAutomaticGearColors} from './operator-gear-color-policy.ts';
import {rigSignature,armorSignature,rigColorAssembly,validRigSolid,validArmorSolid}
 from './operator-rig-authenticity-policy.ts';
import {garmentColorValues,gorkaSpecialtyTexture} from './operator-upper-colorways.ts';
import {garmentSolidHex,isGarmentSolidId,resolvedCuffSolid,resolvedCombatKnitSolid}
 from './operator-garment-color-policy.ts';
import {fabricCamoCompatible,type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {resolveWardrobeDisplayMount} from './operator-wardrobe-mounts.ts';
import type {CarryLocation} from './equipment-carry-placement.ts';
import {createOperatorVisualKit,applyOperatorVisualKit,
 type OperatorVisualKit} from './operator-visual-kit.ts';
import {createGarmentFitAnchors,type GarmentFitAnchors}
 from './operator-garment-fit.ts';
import {createOperatorEquipmentDetails,updateOperatorEquipmentDetails,
 type OperatorEquipmentDetails} from './operator-equipment-details.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {weaponPresentationSockets} from './breach-weapon-presentation.ts';
import {resolveWeaponAssembly,sameWeaponConfiguration,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {weaponGrips,handlingPose,clampReach,
  fitWeaponPose,type WeaponFit,type Handling,type HandlingIntent}
  from './breach-weapon-pose.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  ankleLink:THREE.Mesh;
  anchor:THREE.Vector3;swinging:boolean;
  bend:THREE.Vector3;outOfReach:boolean;};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh;
  bend:THREE.Vector3;outOfReach:boolean};
export type OperatorPose={
  /** Opt-in LAB-only V3 torso fit audition; never set by gameplay. */
  poseV3Preview?:boolean;
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Presentation-only clock advances during tactical pause, never the motor. */
  idleLifeSeconds?:number;
  /** Render-only reconstructed feet and pose: no accumulated render state. */
  replayFeet?:ReplayFeet;deterministic?:boolean;pelvisYaw?:number;
  reload:number;reloadDuration:number;reloadMode?:ReloadMode|null;
  reloadRemoved?:boolean;reloadInserted?:boolean;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};
  doorMethod?:'open'|'close'|'kick'|'hold';down:boolean;
  lastBashAt?:number;bashRole?:BashRole;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  /** Lab preview only: choose an exact stock/weapon readiness posture. */
  handlingOverride?:Handling;
  handlingIntent?:HandlingIntent;threatRange?:number|null;
  handlingTransition?:HandlingTransition;
  obstruction?:boolean;friendlyNear?:boolean;
  clearanceRetraction?:number;clearanceBlocked?:boolean;
  blocked?:boolean;footAllowed?:(point:{x:number;y:number})=>boolean;
  gait?:'walk'|'run'|'pie'|'squeeze';
  /** 0-1 motor-owned vault phase, also restored during replay. */
  traversalProgress?:number;
  equipment?:EquipmentLoadout;flashCharges?:number;
  medicalCarryLocation?:CarryLocation;utilityCarryLocation?:CarryLocation;
  magazineCarryLocations?:readonly CarryLocation[];
  weaponConfiguration?:WeaponConfiguration;
  weaponLightOn?:boolean;
  treatmentActive?:boolean;treatmentProgress?:number;
  treatmentPoint?:{x:number;y:number};
  /** Opt-in to contact-position weight transfer for lab candidate only. */
  hybridSupport?:boolean;
  acceleration?:number;
  aimBlend?:number;recoil?:number;shotHeading?:number;
  hitFade?:number;hitAge?:number;downProgress?:number;flashActive?:boolean;
  hitRegion?:WoundRegion;hitYaw?:number;hitSeverity?:number;
  downPose?:FallPose;
  appearanceSeed?:number;
  faceStyle?:'blank'|'quiet'|'graphic';
  /** Only used in the Wardrobe Lab; never propagated to battle actors. */
  unarmedPreview?:boolean;
  wardrobe?:WardrobeOptions;
};
export type OperatorRig={
  /** Public space: -Z forward / +X right. Legacy animation is internal. */
  root:THREE.Group;
  /** Stable personnel identity used only for camouflage print selection. */
  camoIdentity:string;
  /** +X authored anatomy compatibility node (+90° Y), never world-facing. */
  legacyFrame:THREE.Group;
  /** Future headwear may be authored in -Z using this head-local child. */
  headCanonicalFrame:THREE.Group;
  /** Authoritative, old motor yaw; a tactical heading is never remapped. */
  legacyYaw:number;legacyPitch:number;legacyRoll:number;
  hip:THREE.Group;chest:THREE.Group;head:THREE.Group;
  weapon:THREE.Group;droppedGun:THREE.Group;feet:Foot[];arms:Arm[];
  magazineInserted:THREE.Mesh;magazineHand:THREE.Mesh;
  detachedMagazine:THREE.Group;
  medicalItem:THREE.Mesh;
  weaponBody:THREE.Group;droppedWeaponBody:THREE.Group;
  weaponAccessories:THREE.Group;droppedAccessories:THREE.Group;
  weaponLightLens:THREE.Object3D|null;droppedLightLens:THREE.Object3D|null;
  weaponLensMaterial:THREE.MeshStandardMaterial;
  slingStraps:THREE.Mesh[];
  visualWeapon:WeaponId;visualWeaponConfiguration?:WeaponConfiguration;
  weaponSteel:THREE.Material;weaponDark:THREE.Material;
  pack:THREE.Mesh;helmetShell:THREE.Mesh[];
  armorPanels:THREE.Mesh[];capBill:THREE.Mesh;
  rigPouches:THREE.Mesh[];beltPouch:THREE.Mesh;
  medicalPouch:THREE.Mesh;radioUnit:THREE.Mesh;
  flashCanister:THREE.Mesh;utilityTool:THREE.Mesh;
  gloveCovers:THREE.Mesh[];visualKit:OperatorVisualKit;
  poseCavity:OperatorPoseCavity;
  /** No-render/zero-collider attachment references for future garments. */
  garmentFitAnchors:GarmentFitAnchors;
  equipmentDetails:OperatorEquipmentDetails;
  lastTime:number;lastPose:OperatorPose|null;
  personality:ReturnType<typeof operatorMotionTraits>;
  footsteps:FootstepScheduler;
  /** Non-authoritative request for the motor/controller to reposition. */
  reachRequest:null|{kind:'door';distance:number};
  gripError:number;stockError:number;eyeError:number;
  handlingProfile:HandlingProfile|null;
  lastHandling:Handling|null;lastHandlingAt:number;
  autoHandling:(HandlingTransition&{at:number})|null;
  elbowSpread:[number,number];legGap:[number,number];
  colors:Map<THREE.MeshStandardMaterial,THREE.Color>;
  clothMaterial:THREE.MeshStandardMaterial;vestMaterial:THREE.MeshStandardMaterial;
  trouserMaterial:THREE.MeshStandardMaterial;packMaterial:THREE.MeshStandardMaterial;
  headClothMaterial:THREE.MeshStandardMaterial;
  headArmorMaterial:THREE.MeshStandardMaterial;
  gearMaterial:THREE.MeshStandardMaterial;
  skinMaterial:THREE.MeshStandardMaterial;bootMaterial:THREE.MeshStandardMaterial;
  faceSkinMaterial:THREE.MeshStandardMaterial;
  neckSkinMaterial:THREE.MeshStandardMaterial;
  baseCloth:THREE.Color;baseVest:THREE.Color;helmetBadge:THREE.Mesh;
  appearanceSeed:number;
  dispose:()=>void;
};
const OPERATOR_CLOTH_PALETTE=[0x6f9185,0x80826b,0x8e846e,0x687c8d,
 0x798a79,0x92816a,0x65867c,0x8a8872] as const;
const OPERATOR_VEST_PALETTE=[0x43504b,0x545a47,0x535550,0x46595a,
 0x5a5544,0x415a51,0x636056,0x465354] as const;
const mat=(hex:number,surface?:PixelSurface)=>new THREE.MeshStandardMaterial({color:hex,
  map:surface?operatorPixelTextures.get(surface):null,
  flatShading:true,roughness:.86});
function block(group:THREE.Object3D,x:number,y:number,z:number,
  width:number,height:number,depth:number,material:THREE.Material):THREE.Mesh{
  const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(width,height,depth),
    width,height,depth,material,x,y,z),material);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);return mesh;
}
type GarmentSegmentCut='full'|'bloused'|'cuffed';
/** IK bones retain their normalized [-.5,+.5] coordinates. Fabric UVs,
 * however, must measure the ACTUAL stretched 10/11.25-world-unit limb.
 * Otherwise a 64px master becomes a gigantic stretched patch on each arm. */
function metricSegmentGeometry(w:number,d:number,m:THREE.Material,
 length:number,shorten=0):THREE.BoxGeometry{
 const height=1-shorten;
 const geo=garmentBoxUV(new THREE.BoxGeometry(w,height,d),
  w,height*length,d,m);
 // The proximal joint always remains at -.5. Shrink the distal fabric
 // only; don't alter the IK segment transform or the boot/hand position.
 geo.translate(0,-shorten*.5,0);
 return geo;
}
function bone(parent:THREE.Group,w:number,depth:number,m:THREE.Material,
 length:number){
 const mesh=block(parent,0,0,0,w,1,depth,m);
 const old=mesh.geometry;
 const shapes:Record<GarmentSegmentCut,THREE.BoxGeometry>={
  full:metricSegmentGeometry(w,depth,m,length),
  bloused:metricSegmentGeometry(w,depth,m,length,.30),
  cuffed:metricSegmentGeometry(w,depth,m,length,.26)
 };
 old.dispose();
 mesh.geometry=shapes.full;
 mesh.userData.garmentMetricLength=length;
 mesh.userData.garmentSegmentGeometries=shapes;
 return mesh;
}
function setSegmentCut(mesh:THREE.Mesh,cut:GarmentSegmentCut){
 const shapes=mesh.userData.garmentSegmentGeometries as
  Record<GarmentSegmentCut,THREE.BoxGeometry>|undefined;
 if(shapes&&mesh.geometry!==shapes[cut])mesh.geometry=shapes[cut];
}
export function createOperatorRig(id:string,side:'blue'|'red',
 lazyAccessories=false):OperatorRig{
  // One compatibility seam: new public model root is -Z forward, while all
  // existing limbs, muzzle, grip coordinates and IK remain legacy +X.
  // The +90° frame exactly cancels the root's -90° offset at zero heading.
  const root=new THREE.Group(),legacyFrame=new THREE.Group(),
    hip=new THREE.Group(),chest=new THREE.Group(),head=new THREE.Group(),
    weapon=new THREE.Group(),droppedGun=new THREE.Group();
  root.name='operator-canonical-minus-Z';
  legacyFrame.name='operator-legacy-plus-X';
  legacyFrame.rotation.y=LEGACY_FRAME_YAW;
  root.add(legacyFrame);
  legacyFrame.add(hip,chest,droppedGun);droppedGun.visible=false;
  chest.add(head,weapon);
  const headCanonicalFrame=createCanonicalAttachment(head);
  root.quaternion.copy(canonicalRootOrientation(0,0,0));
  const cloth=mat(side==='red'?0x936e5b:
    id==='moss'?0x80826b:id==='ash'?0x8e846e:
    id==='vale'?0x687c8d:0x6f9185,'fabric');
  const trousers=cloth.clone();
  const boot=mat(0x313935,'rubber'),vest=mat(0x43504b,'fabric'),
    skin=mat(0xb29b83),steel=mat(0x414846,'metal');
  const packFabric=vest.clone(),gearFabric=vest.clone(),
    headCloth=cloth.clone(),headArmor=vest.clone();
   // Only textiles are unfolded across adjacent faces; leave rubber, steel,
   // skin and the approved, separately authored headwear atlas untouched.
   for(const material of [cloth,trousers,vest,packFabric,gearFabric])
    material.userData.fieldworkFabric=true;
   // Fixed grayscale AO uses existing textile shaders and textures.
   for(const kitMaterial of [
     cloth,trousers,vest,packFabric,gearFabric,headCloth,headArmor
    ])enableBakedGearAO(kitMaterial);
  hip.position.y=20.2;
  block(hip,0,0,0,8,5,12,trousers);
  chest.position.y=26;
  const c=CORE_TORSO_CONTACT;
  const baseTorso=block(chest,c.x,c.y,c.z,
   c.width,c.height,c.depth,cloth);
  baseTorso.name='fieldwork-contact-base-torso';
  baseTorso.userData.armorContactShell=true;
  const armorPanels=[block(chest,3,0,0,2.8,9,13,vest),
    block(chest,-3,1,0,2,8,11,vest)];
  // Low-poly padded upper-pec/shoulder contour is the visible buttplate
  // contact. The stock seats into this pad rather than the arm geometry.
  for(const sign of [-1,1])
    armorPanels.push(block(chest,1.35,4.6,sign*6.05,3.8,3.1,2.0,vest));
  // Empty animated attachment node. The day and field pack are now complete
  // exclusive models, so a hidden shared box cannot intersect either one.
  const pack=new THREE.Mesh(new THREE.BufferGeometry(),vest);
  // Front of pack meets the back of the torso (X=-5), not a floating gap.
  pack.position.set(-8.2,0,0);chest.add(pack);
  // Very few additional silhouettes, all rigidly attached to existing bones.
  // No new IK, physics bodies or shot-line geometry.
  const rigPouches=[block(chest,2.1,-2,-7.35,2.4,3.8,2.7,gearFabric),
    block(chest,2.1,-2,7.35,2.4,3.8,2.7,gearFabric)];
  const beltPouch=block(hip,-3,-2.7,-4.3,2.8,3.7,3.2,gearFabric);
  const medicalPouch=block(chest,-1,-4.1,7.7,3.3,4.2,2.5,gearFabric);
  const radioUnit=block(chest,-4.4,2.4,7.5,3.5,5.4,2.8,steel);
  const flashCanister=block(hip,1,-4,7.2,2.5,5.8,2.5,steel);
  const utilityTool=block(chest,-5,-4.1,-7.9,4.4,2.1,2.3,steel);
  for(const mesh of [...rigPouches,beltPouch,medicalPouch,
    radioUnit,flashCanister,utilityTool])mesh.visible=false;
  head.position.y=10;
  // Faces and necks are real receiving surfaces for projected hat/collar
  // shadows, independent of the skin tint shared by arms and hands.
  const faceSkin=skin.clone(),neckSkin=skin.clone();
  const neckMesh=block(head,0,-3,0,3.6,4,3.8,neckSkin);
  const faceMesh=block(head,0,3,0,8,8,8,faceSkin);
  mapSkinReceiverAtlas(neckMesh.geometry as THREE.BoxGeometry);
  mapSkinReceiverAtlas(faceMesh.geometry as THREE.BoxGeometry);
  faceSkin.map=headwearCastShadowAtlas('bare');
  neckSkin.map=collarCastShadowAtlas('base-layer',[]);
  faceSkin.needsUpdate=true;neckSkin.needsUpdate=true;
  const helmetShell=[block(head,0,6,0,9.4,3.5,9.4,vest),
    block(head,4,3,0,2,2.7,8,vest)];
  const capBill=block(head,5.3,5.7,0,5,1.25,8,cloth);
  capBill.visible=false;
  const helmetBadge=block(head,0,7.6,0,9.6,2,9.8,vest);
  helmetBadge.visible=false;
  const feet:Foot[]=[],arms:Arm[]=[],gloveCovers:THREE.Mesh[]=[];
  for(const sideSign of [-1,1]){
    const upper=bone(legacyFrame,4.7,5.3,trousers,LEG_UPPER_LENGTH),
      lower=bone(legacyFrame,4,4.3,trousers,LEG_LOWER_LENGTH);
    // Boots continue up into the shortened hem. Unlike repainting the
    // entire shin as rubber, this is a small, joint-following shaft.
    const shaft=block(lower,0,.35,0,3.84,.32,4.05,boot);
    shaft.visible=false;
    lower.userData.garmentBootShaft=shaft;
    const shoe=block(legacyFrame,0,0,0,8,2.9,5.8,boot);
    // The mesh transform must remain at the scheduled ankle anchor.
    // Translate *vertices in local toe-forward +X* instead: the toe box
    // now extends 5.6 units forward, the heel only 2.4 units behind.
    // This avoids changing foot IK, grounded contact, yaw or replay.
    shoe.geometry.translate(BOOT_FOREFOOT_OFFSET,0,0);
    const ankleLink=bone(legacyFrame,3.8,3.8,boot,2.0);
    ankleLink.visible=false;
    feet.push({upper,lower,shoe,ankleLink,
      anchor:new THREE.Vector3(),
      swinging:false,bend:new THREE.Vector3(1,0,0),outOfReach:false});
    const armUpper=bone(chest,3.9,4.0,cloth,10);
    const armLower=bone(chest,3.4,3.5,cloth,10);
    const hand=block(chest,0,0,0,3.6,3.2,3.9,skin);
    const glove=block(hand,.12,0,0,3.9,3.5,4.1,vest);
    glove.visible=false;gloveCovers.push(glove);
    arms.push({upper:armUpper,lower:armLower,hand,
      bend:new THREE.Vector3(5,-2,sideSign*7),outOfReach:false});
    void sideSign;
  }
  weapon.position.set(8,-5,0);
  // Real weapon-specific silhouettes, using the same receiver-local grip and
  // muzzle axes as the fixed-step shot-time solver. Built only on weapon swap.
  const weaponBody=buildWeaponSilhouette('carbine',steel,boot);
  const droppedWeaponBody=buildWeaponSilhouette('carbine',steel,boot);
  const weaponAccessories=new THREE.Group(),droppedAccessories=new THREE.Group();
  const weaponLensMaterial=mat(0xb7e6df);
  weaponLensMaterial.emissive.setHex(0x7fdac9);
  weaponLensMaterial.emissiveIntensity=.90;
  weapon.add(weaponBody,weaponAccessories);
  droppedGun.add(droppedWeaponBody,droppedAccessories);
  // Three geometry-reused fabric spans connect gun mounts with shoulder
  // routing. No ropes, IK targets, simulated joints or per-frame geometry.
  const slingStraps=[0,1,2].map(()=>{
   const strap=block(chest,0,0,0,.8,1,.7,vest);
   strap.castShadow=false;strap.receiveShadow=false;strap.visible=false;
   return strap;
  });
  const magazineInserted=block(weapon,3,-4,0,2.7,6,2.5,boot);
  const magazineHand=block(chest,0,0,0,2.7,6,2.5,boot);
  magazineHand.visible=false;
  const detachedMagazine=new THREE.Group();
  detachedMagazine.name='detached-authored-magazine';
  detachedMagazine.visible=false;chest.add(detachedMagazine);
  const medicalItem=block(chest,0,0,0,2.3,1.45,2.1,vest);
  const careMark=new THREE.MeshStandardMaterial({
    color:0x9e7767,roughness:1,flatShading:true});
  // Compact pouch follows the hand during treatment; no duplicated stowed kit.
  block(medicalItem,1.21,0,0,.15,.8,.19,careMark);
  block(medicalItem,1.22,0,0,.16,.19,.8,careMark);
  medicalItem.visible=false;
  const equipmentDetails=createOperatorEquipmentDetails(
    medicalPouch,radioUnit,flashCanister,utilityTool,vest,boot,steel);
  // Meshes remain stable attachment nodes; their child models provide the
  // silhouette instead of a large generic steel box under every tool.
  utilityTool.geometry.dispose();
  utilityTool.geometry=new THREE.BufferGeometry();
  flashCanister.geometry.dispose();
  flashCanister.geometry=new THREE.CylinderGeometry(1.25,1.25,5.8,8);
  const visualKit=createOperatorVisualKit(chest,hip,head,pack,baseTorso,feet,arms,
    {cloth,vest,trousers,packFabric,gearFabric,headCloth,headArmor,
      dark:boot,skin,steel},headCanonicalFrame,lazyAccessories);
  // Stage 3A reference nodes only: attached after existing geometry is built.
  // They add no triangles, affect no merging, and change no IK/weapon sockets.
  const garmentFitAnchors=createGarmentFitAnchors({chest,hip,arms,legs:feet});
  const poseCavity=createOperatorPoseCavity(baseTorso,
   [feet[0].upper,feet[1].upper],cloth,trousers);
  // Include costume, face and accessory materials as well as the core skin,
  // cloth and steel. This keeps silhouette inspection and downed desaturation
  // honest instead of leaving floating colored eye marks and gear details.
  const colors=new Map<THREE.MeshStandardMaterial,THREE.Color>();
  root.traverse(obj=>{
    if(obj instanceof THREE.Mesh&&
      obj.material instanceof THREE.MeshStandardMaterial)
      colors.set(obj.material,obj.material.color.clone());
  });
  return {root,camoIdentity:id,legacyFrame,headCanonicalFrame,
    legacyYaw:0,legacyPitch:0,legacyRoll:0,
    hip,chest,head,weapon,droppedGun,feet,arms,pack,
    helmetShell,armorPanels,capBill,rigPouches,beltPouch,
    medicalPouch,radioUnit,flashCanister,utilityTool,gloveCovers,
    visualKit,equipmentDetails,colors,garmentFitAnchors,poseCavity,
    clothMaterial:cloth,vestMaterial:vest,trouserMaterial:trousers,
    packMaterial:packFabric,gearMaterial:gearFabric,
    headClothMaterial:headCloth,headArmorMaterial:headArmor,
    skinMaterial:skin,faceSkinMaterial:faceSkin,neckSkinMaterial:neckSkin,
    bootMaterial:boot,baseCloth:cloth.color.clone(),
    baseVest:vest.color.clone(),helmetBadge,appearanceSeed:0,
    personality:operatorMotionTraits(id),
    magazineInserted,magazineHand,detachedMagazine,
    medicalItem,weaponBody,droppedWeaponBody,
    weaponAccessories,droppedAccessories,weaponLensMaterial,slingStraps,
    weaponLightLens:null,droppedLightLens:null,
    visualWeapon:'carbine',visualWeaponConfiguration:undefined,
    weaponSteel:steel,weaponDark:boot,
    lastTime:-1,lastPose:null,
    footsteps:createFootstepScheduler(),reachRequest:null,
    gripError:0,stockError:0,eyeError:0,handlingProfile:null,
    lastHandling:null,lastHandlingAt:-100,autoHandling:null,
    elbowSpread:[0,0],legGap:[0,0],
    dispose:()=>{
      // All shortened variants must be released, even if not selected at
      // the moment of disposal. They are not scene children themselves.
      const geometries=new Set<THREE.BufferGeometry>();
      root.traverse(obj=>{if(obj instanceof THREE.Mesh){
        geometries.add(obj.geometry);
        const variants=obj.userData.garmentSegmentGeometries as
          Record<string,THREE.BufferGeometry>|undefined;
        if(variants)for(const g of Object.values(variants))geometries.add(g);
        const m=obj.material as THREE.Material;m.dispose();
      }});
      for(const geo of geometries)geo.dispose();
      weaponLensMaterial.dispose();}};
}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function approach(v:number,target:number,rate:number,dt:number){
  return v+clamp(diff(v,target),-rate*dt,rate*dt);
}
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const DOWNED_TINT=new THREE.Color(0x555c57);
/** Outfit, headwear and material maps are static between kit changes.
 * Keep a per-rig snapshot separate from motion/IK, which still runs on
 * every frame. Weak keys release disposed operator preview rigs. */
const appearanceState=new WeakMap<OperatorRig,{key:string;downed:boolean}>();
const poseMath=new WeakMap<OperatorRig,OperatorPoseScratch>();
/** Results are keyed by visible equipment, authored weapon, and the actual
 * shoulder/yaw frame. No pose candidate search runs on every rendered frame. */
const coupledIdleCache=new WeakMap<OperatorRig,{
 key:string;solution:CoupledLowReadySolution|null}>();
/** Identical equipment and pose frames share a fitted solution. Limit
 * memory and avoid repeating a large cold search for every enemy/preview.
 * Solutions are only read/copied by the rig, never mutated in place. */
const sharedCoupledPoseCache=new Map<string,CoupledLowReadySolution|null>();
const MAX_SHARED_COUPLED_POSES=80;
type CarryBlendState={
 lastCoupled:boolean;lastFit:WeaponFit|null;lastWeapon:WeaponId|null;
 from:WeaponFit|null;fromBends:[THREE.Vector3,THREE.Vector3]|null;
 started:number;duration:number;lastSeconds:number;
};
/** Visual-only state for live transitions. Deterministic replay never
 * consumes a previous, unrecorded render frame. */
const carryBlendStates=new WeakMap<OperatorRig,CarryBlendState>();
export function poseOperator(r:OperatorRig,p:OperatorPose,dt:number){
  let scratch=poseMath.get(r);
  if(!scratch){scratch=createOperatorPoseScratch();poseMath.set(r,scratch);}
  if(dt<0||r.lastTime>p.seconds+.03||p.seconds-r.lastTime>1.2){
    r.lastTime=p.seconds;dt=0;
  }
  dt=clamp(dt,0,.08);
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
  const clothing=resolvedWardrobe(p.wardrobe,p.equipment);
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
   const camo=selected&&p.wardrobe?.headwearCamo!=='splittertarn-31'?
     resolvedHeadwearCamo(modelId,p.wardrobe?.headwearCamo):null;
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
  }else appearanceState.set(r,{key:appearanceKey,downed});
  const downProgress=clamp(p.downProgress??(p.down?1:0),0,1);
  const smooth=(t:number)=>{const v=clamp(t,0,1);return v*v*(3-2*v)};
  const buckle=p.down&&!p.surrender?smooth(downProgress/.48):0;
  const kneel=p.surrender?smooth(downProgress/.65):0;
  const physicalSpeed=p.blocked?0:p.velocity;
  const moving=p.down?0:Math.min(1,physicalSpeed/72);
  const direction=p.travelYaw??(r.lastPose?
    Math.atan2(p.z-r.lastPose.z,p.x-r.lastPose.x):p.heading);
  const travel=moving>.14?direction:p.heading;
  // Tactical strafing and reverse movement keep the pelvis oriented toward
  // the threat; translation is not the same thing as facing.
  const lateral=Math.abs(Math.sin(travel-p.heading))>.52;
  const reverse=Math.cos(travel-p.heading)<-.4;
  const hipTarget=moving>.22&&!lateral&&!reverse?travel:p.heading;
  // Do not rotate the pelvis yet: the fixed-step foot contacts are needed
  // before the one authoritative root heading can be selected.
  // Fixed-step recorded acceleration replaces render-rate velocity deltas.
  const braking=clamp(-(p.acceleration??0)/180,-1,1);
  const crouch=p.posture==='crouch'?8:0;
  r.hip.position.y=20.2-crouch;
  r.chest.position.y=26-crouch;
  // Low traversal carries a rearward pelvis and counterbalanced thorax.
  r.hip.position.x=p.posture==='crouch'?-0.85:0;
  r.chest.position.x=p.posture==='crouch'?1.15:0;
  // Build 119: the footstep scheduler owns world contacts. The IK renderer
  // consumes its targets but must never relocate a planted anchor.
  const travelYaw=p.travelYaw??direction;
  const gaitInput:FootstepInput={
    time:p.seconds,position:{x:p.x,y:p.z},rootYaw:-p.heading,
    travelYaw,facingYaw:p.heading,speed:physicalSpeed,turning:p.turning,
    posture:p.posture,injury:p.injury,down:p.down,
    cautious:p.aiming&&moving<.35,blocked:p.blocked,
    gait:p.gait,
    footAllowed:p.footAllowed,
  };
  // The step scheduler is the SOLE writer of foot contacts, including
  // clearance recovery. IK below solves toward these positions; it does
  // not silently substitute its own position or restart a step.
  const targets:[FootTarget,FootTarget]=p.replayFeet?
    validatedReplayFeet(gaitInput,p.replayFeet):
    advanceFootsteps(r.footsteps,gaitInput);
  const kickAge=p.seconds-p.lastDoorAt;
  const kick=p.doorMethod==='kick'&&kickAge>=0&&kickAge<.76?
    kickMotion(kickAge):null;
  const bash=contactReaction(p.seconds-(p.lastBashAt??-100),
    p.bashRole??null,!!p.blocked);
  const handling=p.treatmentActive?'low':p.handlingOverride??handlingPose({
    aim:p.aimBlend??(p.aiming?1:0),moving,
    obstruction:!!p.obstruction||
      (bash.active&&p.bashRole==='receive'),
    friendlyNear:!!p.friendlyNear,
    intent:p.handlingIntent,threatRange:p.threatRange,weapon:p.weapon,
    previous:p.deterministic?undefined:r.lastHandling??undefined,
    heldFor:p.seconds-r.lastHandlingAt
  });
  const passiveBlend=!p.deterministic&&!p.handlingOverride&&
    !p.aiming&&!p.firing&&!p.down&&!p.surrender;
  if(!p.handlingOverride&&handling!==r.lastHandling){
    if(passiveBlend&&r.lastHandling){
      r.autoHandling={from:r.lastHandling,to:handling,alpha:0,
        at:p.seconds,
        fromProfile:r.handlingProfile??handlingProfile(r.lastHandling,p.weapon),
        fromWeapon:{origin:r.weapon.position.clone(),
          rotation:r.weapon.rotation.clone()}};
    }else r.autoHandling=null;
    r.lastHandling=handling;r.lastHandlingAt=p.seconds;
  }
  const auto=r.autoHandling&&passiveBlend?{
    ...r.autoHandling,alpha:smoothHandling(
      (p.seconds-r.autoHandling.at)/.24)}:undefined;
  if(!passiveBlend)r.autoHandling=null;
  if(auto&&auto.alpha>=1)r.autoHandling=null;
  const activeTransition=p.handlingTransition??auto;
  const profile=activeTransition?
    blendedHandlingProfile(activeTransition.from,
      activeTransition.to,activeTransition.alpha,p.weapon,
      activeTransition.fromProfile):
    handlingProfile(handling,p.weapon);
  // Explicit laboratory stances can shift the chest/weight. Live combat
  // retains the authoritative shot-time muzzle/chest transform until the
  // equivalent shot-time balance transform is integrated.
  r.handlingProfile=profile;
  const poseWeight=p.handlingOverride&&!p.down&&!p.surrender?1:0;
  const familyLow=lowReadyFamilyFit(p.weaponConfiguration);
  // Smoothly retire the relaxed hold when accelerating, aiming, reloading
  // or engaging. All combat-facing muzzle fits retain their original data.
  // Retire old independent stock/grip/yaw/elbow offsets. Stationary AR/AK
  // low-ready is handled by ONE coupled physical solution below, while
  // ADS, reload, moving and all non-family weapons retain their old path.
  const relaxedLowReady=0;
  // A pivot requires the stance to catch up with requested facing.
  // In replay/lab this orientation is reconstructed by time, never dt.
  // The pelvis yaw has exactly ONE final writer, after contact scheduling.
  // Live/replay use the recorded pelvis state; the isolated lab uses its
  // scheduler on pivots and a bounded turn toward motor facing otherwise.
  const motorYaw=-hipTarget;
  const scheduledYaw=p.pelvisYaw??(r.footsteps.mode==='pivot'?
    r.footsteps.pelvisYaw:undefined);
  r.legacyYaw=scheduledYaw??(p.deterministic?motorYaw:
    approach(r.legacyYaw,motorYaw,3.8,dt));
  const headingYaw=r.legacyYaw;
  const turn=turnHierarchy({pelvisYaw:headingYaw,
    bodyHeading:p.heading,targetHeading:p.shotHeading??p.heading,
    speed:physicalSpeed,aiming:p.aiming});
  r.chest.rotation.y=p.deterministic?turn.chestYaw:
    approach(r.chest.rotation.y,turn.chestYaw,
      p.aiming?7.5:5.8,dt);
  const idleLife=idleLifeAt(p.idleLifeSeconds??p.seconds,
    p.appearanceSeed??0,{speed:physicalSpeed,aiming:p.aiming||
      (p.aimBlend??0)>.16,firing:p.firing,reloading:p.reload>0,
      down:p.down,surrender:p.surrender,interacting:!!p.treatmentActive||
      p.traversalProgress!==undefined&&p.traversalProgress>0});
  r.head.rotation.y=p.deterministic?turn.headYaw:
    approach(r.head.rotation.y,turn.headYaw,10.0,dt);
  // Seeded micro-glance does not change weapon yaw or shot-time aim.
  // Only the head rotates; never add to last frame's already posed value.
  r.head.rotation.y+=idleLife.glance;
  const motion=bodyFromContacts({velocity:p.down?0:physicalSpeed,
    heading:p.heading,travelYaw,turning:p.turning,
    injury:p.injury,posture:p.posture,feet:targets,gait:p.gait,
    hybridSupport:p.hybridSupport,acceleration:p.acceleration,
    seconds:p.seconds,personalPhase:r.personality.phase,
    personalLooseness:r.personality.looseness,
    tacticalTension:p.aiming||p.handlingIntent==='engage'||
      p.handlingIntent==='pie'||p.handlingIntent==='look'?1:
      p.handlingIntent==='door'||p.posture==='crouch'?.55:0,
    weaponWeight:p.weapon==='shotgun'?1.30:
      p.weapon==='rifle'?1.19:p.weapon==='smg'?.83:1,
    position:{x:p.x,y:p.z}});
  // Pack follows the torso with restrained inertia, not separate timing.
  const packMotion=packInertia(p.acceleration??0,motion.torsoSide);
  r.pack.position.set(-8.2,0,
    packMotion.side*r.personality.packScale);
  r.pack.rotation.z=packMotion.lean*r.personality.packScale;
  // Wide side-steps need a physical lowering of the center of mass,
  // not a longer limb or a shoe teleported away from its world anchor.
  // Build 184: the balance solver already accounts for reachable hip
  // height. Do not apply another independent stance-radius correction.
  const neutralHip=20.2-crouch;
  // Keep BOTH pelvis and chest together when straightening the Lab-only
  // mannequin. Raising only the pelvis pushes shorts/belt into the torso.
  // This lift is cosmetic to the no-gun preview: grounded feet, gait and
  // normal battle skeleton stay unchanged.
  const mannequinLift=p.unarmedPreview?
    neutralMannequinHipRise(physicalSpeed,p.posture,p.down,p.surrender):
    p.handlingOverride==='low'&&!p.aiming&&!p.firing?
      neutralMannequinHipRise(physicalSpeed,p.posture,p.down,p.surrender)*.83:0;
  // Armed Studio low-ready borrows the upright reference's hip/torso lift,
  // but leaves ALL live gameplay/replay contacts and ballistics unchanged.
  const stanceHip=neutralHip+motion.pelvisY-bash.brace;
  r.hip.position.y=Math.max(
    17.35-crouch-buckle*8-kneel*9,
    stanceHip-buckle*8-kneel*9);
  r.hip.position.y-=poseWeight*profile.stanceCompression;
  // The pelvis lifts WITH the upper body; it never drives its visual
  // shell up into a stationary chest.
  r.hip.position.y+=mannequinLift;
  // The pelvic shell accepts support rotation but is not a second
  // independent writer of the world/root heading or foot anchors.
  r.hip.rotation.x=clamp(-motion.support*physicalSpeed/72*.022,-.03,.03);
  r.hip.position.z=motion.pelvisSide+
    poseWeight*profile.pelvisShift;
  const aimLevel=clamp(p.aimBlend??(p.aiming?1:0),0,1);
  // Physical bob fades out before firing: live muzzle geometry remains the
  // same fixed-step weapon solution used by ballistics.
  const freeMotion=p.down||p.surrender||p.firing?0:
    clamp((.32-aimLevel)/.32,0,1);
  r.chest.position.y=26-crouch+idleLife.breathe+motion.pelvisY*.5+
    motion.chestLift*freeMotion*1.4-
    bash.brace*.4-buckle*7-kneel*12+mannequinLift;
  r.chest.position.z=motion.pelvisSide*.75+
    poseWeight*profile.pelvisShift*.45;
  r.chest.rotation.z=motion.torsoForward+idleLife.sway+braking*.018+
    (kick?.torsoLean??0)+bash.lean-
    poseWeight*profile.torsoLean-
    (p.posture==='crouch'?.075:0);
  r.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09)+
    motion.torsoSide;
  r.chest.rotation.y+=motion.torsoYaw+
    poseWeight*profile.torsoTurn+
    relaxedLowReady*(familyLow?.torsoTurn??0);
  if(p.unarmedPreview&&physicalSpeed<.5&&p.posture==='stand'&&
    !p.down&&!p.surrender){
    // Stable unarmed modeling reference. These transforms belong to
    // wardrobe presentation only; no replay/weapon/locomotion changes.
    r.chest.rotation.x=0;
    r.chest.rotation.z=0;
    r.hip.rotation.x=0;
  }
  // A smaller head-only response can run in combat without shifting the
  // weapon/stock muzzle from the authoritative shot-time geometry.
  const sightEngagement=p.unarmedPreview?0:p.handlingOverride?1:
    p.down||p.surrender?0:clamp(p.aimBlend??(p.aiming?1:0),0,1);
  r.head.position.y=10-sightEngagement*profile.headDrop;
  r.head.rotation.x=p.unarmedPreview&&physicalSpeed<.5&&
    p.posture==='stand'&&!p.down?0:
    motion.headCounter+bash.head+poseWeight*profile.headPitch;
  // Apply the collapsing root transform before solving the legs.
  // Inverse full-body rotation holds each shoe in world-space contact
  // instead of sweeping planted boots through the floor during a fall.
  const reaction=hitStagger(p.hitRegion??'torso',
    p.hitYaw??p.heading,p.heading,
    p.hitAge===undefined?100:p.hitAge,p.hitSeverity??1);
  const injuryTilt=p.injury===2?.16:p.injury===1?.05:0;
  const collapse=fallAngles(p.downPose??'forward',downProgress);
  const impactPulse=Math.sin(Math.PI*downProgress);
  const vaultPhase=Math.max(0,Math.min(1,p.traversalProgress??0));
  const vaultTuck=vaultPhase>0&&vaultPhase<1?
    Math.sin(Math.PI*vaultPhase):0;
  r.legacyPitch=p.surrender?-.22:
    p.down?collapse.x+reaction.forward*.12*impactPulse:
      -(injuryTilt+reaction.forward)-vaultTuck*.26;
  r.legacyRoll=p.surrender?.09:
    p.down?collapse.z+reaction.side*.10*impactPulse:
      clamp(p.injury===2?.065:p.injury===1?.018:0,0,.08)+
      reaction.side;
  // The scene translates the whole miniature to the motor's elevation.
  // Here only tuck the local torso. Avoid a second independent vertical arc.
  r.root.position.y=p.surrender?-3-3*kneel:p.down?collapse.y:
    -vaultTuck*2.8;
  // World-space anatomy is IDENTICAL to the old model:
  // canonicalRoot * legacyFrame(+90 Y) = original Euler(pitch,yaw,roll).
  r.root.quaternion.copy(
    canonicalRootOrientation(r.legacyPitch,r.legacyYaw,r.legacyRoll));
  const bodyInverse=scratch.bodyInverse.setFromEuler(
    scratch.bodyEuler.set(r.legacyPitch,r.legacyYaw,r.legacyRoll,'XYZ')).invert();
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1,target=targets[i];
    const hipLocal=scratch.hips[i].set(0,r.hip.position.y,
      r.hip.position.z+sign*LEG_HIP_SIDE);
    const anchor=target.position;
    foot.anchor.set(anchor.x,1.45,anchor.y);
    // Replay seeks must never inherit a pole fallback from another time.
    if(p.deterministic)foot.bend.set(1,0,0);
    foot.swinging=!target.contact;
    const targetWorld=scratch.targets[i].set(target.position.x,
      1.45+target.height,target.position.y);
    if(i===1&&kick){
      const motion=smooth((kick.progress-.30)/.23)*
        (1-smooth((kick.progress-.67)/.25));
      if(p.doorPoint){
        const dx=p.x-p.doorPoint.x,dz=p.z-p.doorPoint.y;
        const gap=Math.hypot(dx,dz)||1;
        // The boot IK solves toward the door's REAL leaf, not a generic
        // forward kick animation that can miss the panel entirely.
        const contact=scratch.kickContact.set(p.doorPoint.x+dx/gap*1.5,9,
          p.doorPoint.y+dz/gap*1.5);
        targetWorld.lerp(contact,motion);
      }else{
        targetWorld.x+=Math.cos(p.heading)*kick.reach;
        targetWorld.z+=Math.sin(p.heading)*kick.reach;
        targetWorld.y+=kick.lift;
      }
      foot.swinging=true;
    }
    const relative=scratch.relative[i].copy(targetWorld)
      .sub(scratch.rootPoint.set(p.x,r.root.position.y,p.z))
      .applyQuaternion(bodyInverse);
    const leg=solveTwoBone(hipLocal,relative,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
      scratch.legPoles[i],LEG_LIMITS,foot.bend,scratch.legs[i]);
    // An unreachable leg reports a gap. Never move the boot independently
    // of its contact schedule: recoveries are requested by the scheduler.
    foot.bend.copy(leg.bendPlane);
    foot.outOfReach=!leg.reached;
    // The boot follows the scheduled contact, so report the anatomical
    // ankle separation for tuning rather than silently hiding it.
    r.legGap[i]=leg.effector.distanceTo(relative);
    // Contact remains in world space. Unreachable limbs report a constraint
    // violation instead of spinning the knee or teleporting their boot.
    alignSegment(foot.upper,hipLocal,leg.joint,scratch.sides[i]);
    alignSegment(foot.lower,leg.joint,leg.effector,scratch.sides[i]);
    // Final small reach extension is represented by a boot-colored
    // articulated ankle cuff, never a floating shoe or stretched shin.
    // The original two-bone segment lengths remain unchanged.
    foot.ankleLink.visible=r.legGap[i]>.10;
    if(foot.ankleLink.visible)
      alignSegment(foot.ankleLink,leg.effector,relative,scratch.sides[i]);
    foot.shoe.position.copy(relative);
    const pitch=target.pitch??0;
    foot.shoe.rotation.z=pitch;
    // The shoe's world-space anchor remains authoritative even while its
    // visual box rocks around the local center.
    // A boot rotates only during its scheduled swing, not with the pelvis.
    foot.shoe.rotation.y=target.worldYaw-headingYaw;
  }
  // Build 120: stock, both grips and forearm targets share a single rigid
  // firearm transform. The fit searches reachable posture before limb IK.
  const config=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  if(r.visualWeapon!==p.weapon||
     !sameWeaponConfiguration(r.visualWeaponConfiguration,config)){
    // A weapon/platform or immutable attachment configuration changed.
    // Keep the live and dropped silhouette exactly in sync.
    for(const group of [r.weaponBody,r.droppedWeaponBody,
      r.weaponAccessories,r.droppedAccessories,r.detachedMagazine])
      clearWeaponSilhouette(group);
    const models=[
      [r.weaponBody,buildWeaponSilhouette(p.weapon,r.weaponSteel,r.weaponDark,config)],
      [r.droppedWeaponBody,buildWeaponSilhouette(p.weapon,r.weaponSteel,r.weaponDark,config)]
    ] as const;
    for(const [dest,model] of models)
      while(model.children.length)dest.add(model.children[0]);
    // Detachable geometry is copied from precisely the same named AR/AK
    // magazine slot. No extra placeholder or alternate silhouette exists.
    const magazineSocket=weaponPresentationSockets(p.weapon,config).magazine;
    for(const mesh of r.weaponBody.children){
      if(!(mesh instanceof THREE.Mesh)||!mesh.name.startsWith('family-magazine-'))
        continue;
      const copy=mesh.clone();copy.geometry=mesh.geometry.clone();
      copy.position.x-=magazineSocket.x;copy.position.y-=magazineSocket.y;
      r.detachedMagazine.add(copy);
    }
    if(config){
      for(const dest of [r.weaponAccessories,r.droppedAccessories]){
        const model=buildWeaponAccessories(config,r.weaponSteel,r.weaponDark,
         r.weaponLensMaterial);
        while(model.children.length)dest.add(model.children[0]);
      }
    }
    r.weaponLightLens=r.weaponAccessories.getObjectByName('weapon-light-lens')??null;
    r.droppedLightLens=r.droppedAccessories.getObjectByName('weapon-light-lens')??null;
    r.visualWeapon=p.weapon;r.visualWeaponConfiguration=config;
  }
  if(r.weaponLightLens)r.weaponLightLens.visible=!!p.weaponLightOn&&
    !p.down&&!p.surrender;
  if(r.droppedLightLens)r.droppedLightLens.visible=false;
  const data=weaponGrips(p.weapon,p.weaponConfiguration,
    handling,relaxedLowReady);
  const recoil=p.recoil??(p.firing?1.5:0);
  const relativeYaw=-(p.shotHeading??p.heading)-r.legacyYaw-
    r.chest.rotation.y;
  const shoulderFor=(i:number)=>{
    const sign=i===0?-1:1;
    const base=i===0?ANATOMY.shoulderLeft:ANATOMY.shoulderRight;
    // A modular rifle's approved low-ready shoulders are the *actual*
    // anatomical joints. The explicit Lab pose formerly shifted both
    // shoulders .42 units downward, invalidating the physical pose that
    // gameplay already used. Other handling modes retain their profiles.
    const shoulderWeight=handling==='low'&&
      !!p.weaponConfiguration?.build?0:poseWeight;
    return P(base.x+shoulderWeight*(i===0?
      profile.supportShoulderForward:profile.firingShoulderForward),
      base.y+shoulderWeight*profile.shoulderLift,
      base.z-sign*shoulderWeight*profile.shoulderInward);
  };
  // The coupled solution is deliberately restricted to relaxed, stationary,
  // two-handed AR/AK presentation. Combat aim and shot-time geometry remain
  // on the existing authoritative pose path.
  const coupledConfig=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  // A reload starts from an already validated stationary two-handed
  // low-ready rifle hold. On the V3 Lab preview ONLY, seed the reload
  // weapon with that fit instead of abruptly switching to legacy IK.
  // Do not use the coupled idle *arm* solution during the active reload:
  // the magazine hand is released and needs independent action IK.
  const previewReloadSeed=p.poseV3Preview===true&&
    p.reload>0&&p.reloadDuration>0;
  const eligible=!!coupledConfig?.build&&handling==='low'&&
    p.posture==='stand'&&physicalSpeed<.45&&
    Math.abs(p.turning)<.28&&!p.down&&!p.surrender&&!p.firing&&
    !p.aiming&&(p.aimBlend??0)<.02&&
    (p.reload<=0||previewReloadSeed)&&
    !p.treatmentActive&&!activeTransition&&
    p.seconds-p.lastDoorAt>1.2&&p.seconds-p.lastThrowAt>.85&&
    (p.hitAge===undefined||p.hitAge<0||p.hitAge>1.1);
  let coupled:CoupledLowReadySolution|null=null;
  let reloadSeed:CoupledLowReadySolution|null=null;
  if(eligible&&coupledConfig){
    const look=resolvedWardrobe(p.wardrobe,p.equipment);
    const shoulders:[THREE.Vector3,THREE.Vector3]=[
      shoulderFor(0),shoulderFor(1)];
    const solveAtTorsoYaw=(assistYaw:number)=>{
      // Offset chest yaw and subtract it from chest-local weapon yaw:
      // the physical shoulder axes and weapon/hand contacts stay coherent.
      const localYaw=relativeYaw-assistYaw;
      const key=JSON.stringify([p.weapon,coupledConfig.build,
        coupledConfig.slots,look.top,look.armorStyle,look.rigStyle,
        poseWeight,Number(localYaw.toFixed(4)),
        shoulders.map(v=>v.toArray().map(n=>Number(n.toFixed(3))))]);
      const cache=coupledIdleCache.get(r);
      if(cache?.key===key)return cache.solution;
      let result:CoupledLowReadySolution|null;
      if(sharedCoupledPoseCache.has(key))
        result=sharedCoupledPoseCache.get(key)??null;
      else{
        result=solveCoupledLowReady({weapon:p.weapon,
          configuration:coupledConfig,
          armor:poseClearanceEnvelope(
            look.armorStyle,look.rigStyle,look.top),
          shoulders,nominalYaw:localYaw});
        sharedCoupledPoseCache.set(key,result);
        if(sharedCoupledPoseCache.size>MAX_SHARED_COUPLED_POSES){
          const oldest=sharedCoupledPoseCache.keys().next().value;
          if(oldest!==undefined)sharedCoupledPoseCache.delete(oldest);
        }
      }
      if(assistYaw===0)coupledIdleCache.set(r,{key,solution:result});
      return result;
    };
    // Only the explicit Lab query may audition body/weapon coupling.
    // Normal gameplay, replay and authoritative aim retain original yaw.
    const previewAssist=p.poseV3Preview===true&&
      p.handlingOverride==='low';
    const selected=chooseTorsoAssist(solveAtTorsoYaw,previewAssist);
    coupled=selected?.solution??null;
    const torsoAssistYaw=selected?.yaw??0;
    if(previewAssist)r.chest.rotation.y+=torsoAssistYaw;
    r.root.userData.lowReadyPoseReport={
      status:coupled?.status??'unresolved',
      mode:coupled?.mode??'unresolved',weapon:p.weapon,
      fittingYaw:relativeYaw-torsoAssistYaw,torsoAssistYaw,
      fittingShoulders:shoulders.map(v=>v.toArray()),
      armor:look.armorStyle,rig:look.rigStyle,top:look.top,
      penetration:coupled?.penetration??null,
      softContact:coupled?.softContact??null,
      poseQuality:coupled?.quality??null,
      elbowLeft:coupled?.arms[0].joint.toArray()??null,
      elbowRight:coupled?.arms[1].joint.toArray()??null,
      supportFraction:coupled?.supportFraction??null,
      candidates:coupled?.candidates??0};
    if(previewReloadSeed){
      // Preserve actual firearm contacts, but never keep the static
      // support elbow during the released-hand reload animation.
      reloadSeed=coupled;coupled=null;
    }
  }else r.root.userData.lowReadyPoseReport=null;
  let fit=reloadSeed?.fit??coupled?.fit??fitWeaponPose({weapon:p.weapon,handling,
    configuration:p.weaponConfiguration,
    yaw:relativeYaw,
    recoil,clearanceRetraction:p.clearanceRetraction,
    relaxedLowReady,
    swayYaw:motion.weaponYaw*freeMotion,
    swayPitch:motion.weaponPitch*freeMotion,
    aimBlend:p.handlingOverride?undefined:
      p.aimBlend??(p.aiming?1:0),
    blendFrom:activeTransition?.from,
    blendAlpha:activeTransition?.alpha,
    blendSnapshot:activeTransition?.fromWeapon});
  // Small, deterministic rifle manipulation is permissible in the Lab
  // only while reloading: never alters shot-time muzzle or live aiming.
  // It pivots about the seated stock so the firing wrist can clear gear.
  if(p.poseV3Preview&&p.reload>0&&p.reloadDuration>0&&
     !p.firing&&!p.down&&!p.surrender&&coupledConfig?.build){
    fit=choreographV3ReloadWeapon(fit,
      clamp(1-p.reload/p.reloadDuration,0,1),
      p.reloadMode??(p.weapon==='shotgun'?'shells':'emergency')).fit;
  }
  // Lab-only: a family rifle may be gripped farther back on its *actual*
  // handguard/magwell. This is a contact change, never a muzzle transform.
  // Do not apply to shot-time ballistics or alter an approved coupled pose.
  if(p.poseV3Preview&&!coupled&&coupledConfig?.build&&
     !p.firing&&!p.down&&!p.surrender&&p.reload<=0){
    const look=resolvedWardrobe(p.wardrobe,p.equipment);
    const choice=chooseV3SupportGrip({
      weapon:p.weapon,configuration:coupledConfig,fit,
      shoulder:shoulderFor(0),firingShoulder:shoulderFor(1),
      envelope:poseClearanceEnvelope(
        look.armorStyle,look.rigStyle,look.top),
      mode:p.reload>0?'reload':p.aiming||handling==='ads'?
        'aim':'carry'
    });
    fit=choice.fit;
    r.root.userData.poseV3SupportGrip={
      selected:choice.selected,fraction:choice.fraction,
      quality:choice.quality,candidates:choice.candidates,
      reason:choice.reason
    };
  }else r.root.userData.poseV3SupportGrip=null;
  // V3 Stage 6b: rotate the *chest* a few degrees and counter-rotate the
  // rigid weapon into its new local frame. World muzzle, stock, firing grip
  // and the existing reload interaction path stay in the same positions.
  // This is a whole-pair solution, not two competing elbow corrections.
  let coordinatedDynamic:ReturnType<typeof solveV3CoordinatedPose>|null=null;
  let v3ReloadClearanceFront:number|undefined;
  let v3LeanParentX=0,v3LeanParentY=0,v3LeanParentZ=0;
  const v3ReloadActive=p.reload>0&&p.reloadDuration>0;
  const v3ReloadProgress=v3ReloadActive?
    clamp(1-p.reload/p.reloadDuration,0,1):0;
  const v3ReloadMode=p.reloadMode??
    (p.weapon==='shotgun'?'shells':'emergency');
  const v3ThrowAge=p.seconds-p.lastThrowAt;
  const v3DoorAge=p.seconds-p.lastDoorAt;
  const v3Interacting=!!p.treatmentActive||
    v3ThrowAge>=0&&v3ThrowAge<.70||
    v3DoorAge>=0&&v3DoorAge<1.12&&
      !!p.doorPoint&&p.doorMethod!=='kick';
  if(p.poseV3Preview&&!coupled&&coupledConfig?.build&&
     !p.firing&&!p.down&&!p.surrender&&!p.unarmedPreview&&
     !v3Interacting&&!activeTransition){
    const outfit=resolvedWardrobe(p.wardrobe,p.equipment);
    const activeReloadSocket=v3ReloadActive?
      weaponPresentationSockets(p.weapon,p.weaponConfiguration):null;
    const envelope=poseClearanceEnvelope(
      outfit.armorStyle,outfit.rigStyle,outfit.top);
    if(v3ReloadActive)v3ReloadClearanceFront=envelope.front;
    const releasedTarget=v3ReloadActive?choreographV3ReloadHand({
      fit,lengthScale:data.lengthScale,
      progress:v3ReloadProgress,mode:v3ReloadMode,
      family:coupledConfig.build.family,
      supportX:data.supportX,supportY:data.supportY,
      primaryX:data.primaryX,clearanceFront:envelope.front,
      magazineSocket:activeReloadSocket?.magazinePart?
        activeReloadSocket.magazine:undefined}).target:undefined;
    const result=solveV3CoordinatedPose({
      fit,weapon:p.weapon,configuration:coupledConfig,
      shoulders:[shoulderFor(0),shoulderFor(1)],
      chestRotation:r.chest.rotation,
      envelope,
      mode:v3ReloadActive?'reload':p.aiming||handling==='ads'?
        'aim':'carry',
      releasedSupportTarget:releasedTarget
    });
    r.root.userData.poseV3CoordinatedReport={
      status:result.status,yaw:result.yaw,leanX:result.leanX,
      candidates:result.candidates,
      validCandidates:result.validCandidates,
      rejects:{...result.rejects},
      quality:result.quality
    };
    if(result.status==='clear'&&result.arms){
      coordinatedDynamic=result;
      fit=result.fit;
      // No per-frame scratch allocation on the main render hot path.
      const offset=new THREE.Vector3(result.leanX,0,0)
        .applyQuaternion(new THREE.Quaternion().setFromEuler(
          r.chest.rotation));
      v3LeanParentX=offset.x;
      v3LeanParentY=offset.y;
      v3LeanParentZ=offset.z;
      // Existing body rotation is set afresh from pose time on every call.
      // Apply exactly one deterministic delta, not frame-history easing.
      r.chest.rotation.y+=result.yaw;
    }
  }else r.root.userData.poseV3CoordinatedReport=null;
  let carryTransitionActive=false,carryTransitionAlpha=1;
  let carryTransitionBends:[THREE.Vector3,THREE.Vector3]|null=null;
  if(!p.deterministic&&!p.down&&!p.surrender){
    let bridge=carryBlendStates.get(r);
    if(!bridge){
      bridge={lastCoupled:!!coupled,lastFit:null,lastWeapon:null,
        from:null,fromBends:null,started:p.seconds,duration:.25,
        lastSeconds:p.seconds};
      carryBlendStates.set(r,bridge);
    }
    if(p.seconds<bridge.lastSeconds-.01||
       p.seconds-bridge.lastSeconds>1.2||
       bridge.lastWeapon!==null&&bridge.lastWeapon!==p.weapon){
      bridge.from=null;bridge.fromBends=null;
      bridge.lastFit=null;bridge.lastCoupled=!!coupled;
    }
    if(bridge.lastFit&&bridge.lastCoupled!==!!coupled){
      bridge.from=bridge.lastFit;
      bridge.fromBends=[r.arms[0].bend.clone(),r.arms[1].bend.clone()];
      bridge.started=p.seconds;
      bridge.duration=coupled?.34:.22;
    }
    bridge.lastCoupled=!!coupled;
    bridge.lastWeapon=p.weapon;
    bridge.lastSeconds=p.seconds;
    if(bridge.from){
      const alpha=(p.seconds-bridge.started)/bridge.duration;
      if(alpha>=1){bridge.from=null;bridge.fromBends=null;}
      else{
        carryTransitionActive=true;
        carryTransitionAlpha=lowReadyBlendPhase(alpha);
        carryTransitionBends=bridge.fromBends;
        fit=interpolateWeaponCarry(bridge.from,fit,alpha);
      }
    }
    bridge.lastFit=fit;
  }
  r.gripError=fit.contactError;
  r.stockError=fit.stockError;
  // Contact coordinates and visible weapon use one rigid transform.
  r.weapon.scale.set(data.lengthScale,1,1);
  r.droppedGun.scale.set(data.lengthScale,1,1);
  r.weapon.rotation.copy(fit.rotation);
  r.weapon.position.copy(fit.origin);
  // On ADS, bring the eyes toward the actual sight line, keeping the
  // firearm fixed. Head-only accommodation cannot change shot ballistics.
  r.head.position.z=0;
  if(!p.unarmedPreview&&handling==='ads'&&!p.down&&!p.surrender){
    const strength=p.handlingOverride?1:
      clamp(p.aimBlend??(p.aiming?1:0),0,1);
    const eye=P(4.5,r.head.position.y+3,3.0);
    const sight=P(-1*data.lengthScale,
      p.weaponConfiguration?resolveWeaponAssembly(p.weaponConfiguration).sightHeight:2.6,0)
      .applyEuler(fit.rotation).add(fit.origin);
    const ray=P(1,0,0).applyEuler(fit.rotation).normalize();
    const nearest=sight.addScaledVector(ray,
      eye.clone().sub(sight).dot(ray));
    // In the Lab the shoulder girdle and chest now help align the sight,
    // so the head should not have to crane dramatically toward the rifle.
    const maxHeadVertical=p.handlingOverride?1.45:2.2;
    const maxHeadLateral=p.handlingOverride?1.2:1.6;
    r.head.position.y+=clamp(nearest.y-eye.y,
      -maxHeadVertical,maxHeadVertical)*strength;
    r.head.position.z+=clamp(nearest.z-eye.z,
      -maxHeadLateral,maxHeadLateral)*strength;
  }
  const eye=P(4.5,r.head.position.y+3,3+r.head.position.z);
  const sight=P(-1*data.lengthScale,
    p.weaponConfiguration?resolveWeaponAssembly(p.weaponConfiguration).sightHeight:2.6,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const axis=P(1,0,0).applyEuler(fit.rotation).normalize();
  const delta=eye.sub(sight);
  r.eyeError=delta.addScaledVector(axis,-delta.dot(axis)).length();
  // Weapon kick and muzzle flash may not break solved hand contacts.
  // A physical door reach may shift the chest a little over the support
  // foot, but the whole character is never allowed to tip like a rigid pole.
  const treatmentActive=!!p.treatmentActive&&!p.down&&!p.surrender;
  const reloadActive=p.reload>0&&p.reloadDuration>0;
  const reloadProgress=reloadActive?
    clamp(1-p.reload/p.reloadDuration,0,1):0;
  const reloadMode=p.reloadMode??(p.weapon==='shotgun'?'shells':'emergency');
  const magazinePhase=reloadPhase(reloadProgress,reloadMode);
  const authoredMagazine=r.detachedMagazine.children.length>0;
  const mountedMagazine=!(p.reloadRemoved&&!p.reloadInserted)&&
    (!reloadActive||reloadProgress<.29||reloadProgress>=.82);
  // The authored family magazine and old fallback are mutually exclusive.
  r.magazineInserted.visible=!authoredMagazine&&p.weapon!=='shotgun'&&
    mountedMagazine;
  for(const mesh of r.weaponBody.children)
    if(mesh.name.startsWith('family-magazine-'))mesh.visible=mountedMagazine;
  r.magazineHand.visible=!authoredMagazine&&reloadActive&&
    magazinePhase!=='reach'&&magazinePhase!=='settle';
  r.detachedMagazine.visible=authoredMagazine&&reloadActive&&
    !mountedMagazine&&magazinePhase!=='settle'&&!p.down&&!p.surrender;
  r.magazineHand.scale.set(
    p.weapon==='shotgun'?.48:1,p.weapon==='shotgun'?.55:1,1);
  const throwAge=p.seconds-p.lastThrowAt;
  const throwActive=throwAge>=0&&throwAge<.70;
  const doorAge=p.seconds-p.lastDoorAt;
  const doorActive=doorAge>=0&&doorAge<1.12&&!!p.doorPoint&&
    p.doorMethod!=='kick';
  // Body-assisted V3 preview keeps the firearm world-fixed by applying
  // the matching parent-space chest lean after the usual door/bashing reset.
  r.chest.position.x=bash.reach*.18+v3LeanParentX;
  r.chest.position.y+=v3LeanParentY;
  r.chest.position.z+=v3LeanParentZ;
  r.reachRequest=null;
  r.weapon.visible=(!p.down&&!p.surrender)||downProgress<.30;
  r.droppedGun.visible=(p.down||p.surrender)&&downProgress>=.30;
  const leftGrip=P(data.supportX,data.supportY,-1.6);
  const rightGrip=P(data.primaryX,data.primaryY,1.8);
    const handOwners=resolvePoseContactOwners({
    surrender:p.surrender,down:p.down,downProgress,
    treatmentActive,reloadActive,reloadProgress,reloadMode,
    throwActive,pushActive:bash.active&&p.bashRole==='push',
    woundedGuard:!p.down&&p.injury>0&&p.hitRegion!=='leg'&&
      !p.aiming&&!p.firing&&p.hitAge!==undefined&&
      p.hitAge>=0&&p.hitAge<1.1,doorActive
  });
  const releaseLeft=handOwners.left!=='weapon';
  const releaseRight=handOwners.right!=='weapon';
  let reaching=false;
  let reloadHandChest:THREE.Vector3|null=null;
  r.medicalItem.visible=treatmentActive;
  let fullDoorContact:THREE.Vector3|null=null;
  if(p.surrender){
    // Deliberate visible surrender: discard the gun, kneel and raise both
    // hands overhead. Unlike an incapacitated actor this is not a fall.
    
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-7);
    rightGrip.set(-1,3+15*raised,7);
  }else if(p.down){
    // Support hand gives way first, then the firing hand releases.
    
    leftGrip.set(-3,-7,-8);rightGrip.set(-2,-8,8);
  }else if(treatmentActive){
    reaching=true;
    const target=p.treatmentPoint??{x:p.x+Math.cos(p.heading)*12,
      y:p.z+Math.sin(p.heading)*12};
    const local=P(target.x-p.x,12-r.chest.position.y,target.y-p.z);
    local.applyAxisAngle(P(0,1,0),-r.legacyYaw);
    local.applyAxisAngle(P(0,1,0),-r.chest.rotation.y);
    const reach=smooth((p.treatmentProgress??0)/.26);
    const left=fit.support.clone().lerp(local.clone().add(P(-1,3,-2)),reach);
    const right=fit.primary.clone().lerp(local.clone().add(P(1,3,2)),reach);
    leftGrip.copy(left);rightGrip.copy(right);
    r.medicalItem.position.copy(left);
  }else if(reloadActive){
    
    const sockets=weaponPresentationSockets(p.weapon,p.weaponConfiguration);
    const hand=reloadHandKey(reloadProgress,reloadMode,
      data.supportX,data.supportY,data.primaryX,
      sockets.magazinePart?sockets.magazine:undefined);
    leftGrip.set(hand.x,hand.y,hand.z);
    reloadHandChest=p.poseV3Preview?
      choreographV3ReloadHand({
        fit,lengthScale:data.lengthScale,progress:reloadProgress,
        mode:reloadMode,family:coupledConfig?.build?.family,
        supportX:data.supportX,supportY:data.supportY,
        primaryX:data.primaryX,
        clearanceFront:v3ReloadClearanceFront,
        magazineSocket:sockets.magazinePart?sockets.magazine:undefined
      }).target:
      reloadHandChestTarget({
        fit,lengthScale:data.lengthScale,progress:reloadProgress,
        mode:reloadMode,supportX:data.supportX,supportY:data.supportY,
        primaryX:data.primaryX,
        magazineSocket:sockets.magazinePart?sockets.magazine:undefined
      });
  }else if(throwActive){
    
    const t=Math.sin(Math.PI*clamp(throwAge/.7,0,1));
    leftGrip.set(data.supportX+8*t,4+7*t,-7);
  }else if(p.surrender){
    
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-6);
    rightGrip.set(-1,3+15*raised,6);
  }else if(bash.active&&p.bashRole==='push'){
    // A short forearm/shoulder extension separates the opponent, while
    // the primary hand keeps the gun from flailing through the torso.
    
    leftGrip.set(data.supportX+bash.reach*2,-4,-6);
  }else if(!p.down&&p.injury>0&&
    p.hitRegion!=='leg'&&!p.aiming&&!p.firing&&
    p.hitAge!==undefined&&p.hitAge>=0&&p.hitAge<1.1){
    // Only release the support grip to guard a fresh injury when the
    // operator is not actively aiming or already using that hand.
    
    const progress=Math.sin(Math.PI*clamp(p.hitAge/1.1,0,1));
    leftGrip.set(3+progress*2,-5,-5);
  }else if(doorActive&&p.doorPoint){
    reaching=true;
    const local=P(p.doorPoint.x-p.x,19-r.chest.position.y,
      p.doorPoint.y-p.z);
    local.applyAxisAngle(P(0,1,0),-r.legacyYaw);
    local.applyAxisAngle(P(0,1,0),-r.chest.rotation.y);
    // Deliberate hand-off: release weapon, reach physical handle, and
    // return the support hand to its real gun grip after the latch moves.
    const reach=smooth(doorAge/.32)*
      (1-smooth((doorAge-.62)/.48));
    r.chest.position.x=clamp(local.x-13,0,2.4)*reach;
    fullDoorContact=local.sub(P(r.chest.position.x,0,0)).clone();
    leftGrip.copy(fit.support).lerp(fullDoorContact,reach);
  }
  // Preview-only evaluation; production continues to use the proven path.
  const dynamicLook=p.poseV3Preview?
    resolvedWardrobe(p.wardrobe,p.equipment):null;
  const dynamicEnvelope=dynamicLook?poseClearanceEnvelope(
    dynamicLook.armorStyle,dynamicLook.rigStyle,dynamicLook.top):null;
  const v3DynamicReports:Array<{
    side:string;status:string;reason:string;
    candidates:number;elbowDrop:number;outwardFlare:number;
    hardDepth:number;quality:number;
    reachError:number;violations:string[];
    evaluations:number;softScale:number;
  }>=[];
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1,arm=r.arms[i];
    const shoulder=shoulderFor(i);
    const grip=i===0?leftGrip:rightGrip;
    let desired:THREE.Vector3;
    if(p.down&&(i===0&&releaseLeft||i===1&&releaseRight)){
      desired=grip.clone();
    }else if(p.surrender||i===0&&reaching){
      desired=grip.clone();
    }else if(i===0&&!releaseLeft){
      // Ordinary walking, side shuffles, turning and ADS never release
      // the support hand. Only a deliberate action may move it.
      desired=fit.support.clone();
    }else if(i===1){
      desired=treatmentActive&&releaseRight?rightGrip.clone():fit.primary.clone();
    }else{
      desired=grip.clone().multiply(P(data.lengthScale,1,1))
        .applyEuler(fit.rotation).add(fit.origin);
      if(i===0&&reloadHandChest)desired.copy(reloadHandChest);
    }
    // The coupled fitting solver already chose BOTH elbows and the exact
    // physical wrist contacts in one collision-checked candidate.
    // Do not re-run per-arm IK and accidentally undo its armor clearance.
    if(coupled&&!carryTransitionActive&&!p.unarmedPreview){
      const joint=coupled.arms[i];
      r.elbowSpread[i]=Math.max(0,sign*(joint.joint.z-shoulder.z));
      arm.bend.copy(joint.bendPlane);arm.outOfReach=false;
      alignSegment(arm.upper,shoulder,joint.joint,scratch.sides[i]);
      alignSegment(arm.lower,joint.joint,joint.effector,scratch.sides[i]);
      arm.hand.position.copy(joint.effector);
      arm.hand.rotation.set(0,clamp(fit.rotation.y,-1,1),0);
      continue;
    }
    // A jointly validated V3 pair owns BOTH elbow placements. Do not run
    // independent IK again and accidentally undo its clearance selection.
    if(coordinatedDynamic?.arms&&!carryTransitionActive&&
       !p.unarmedPreview){
      const pose=coordinatedDynamic.arms[i];
      const report=coordinatedDynamic.reports![i];
      r.elbowSpread[i]=Math.max(0,sign*(pose.joint.z-shoulder.z));
      arm.bend.copy(pose.bendPlane);
      arm.outOfReach=false;
      alignSegment(arm.upper,shoulder,pose.joint,scratch.sides[i]);
      alignSegment(arm.lower,pose.joint,pose.effector,scratch.sides[i]);
      arm.hand.position.copy(pose.effector);
      arm.hand.rotation.set(0,clamp(fit.rotation.y,-1,1),0);
      v3DynamicReports.push({
        side:i===0?'support':'firing',status:'clear',reason:'valid',
        candidates:6,elbowDrop:report.elbowDrop,
        outwardFlare:report.outwardFlare,
        hardDepth:report.hardDepth,quality:report.quality,
        reachError:0,violations:[],
        evaluations:6,softScale:coordinatedDynamic.softScales![i]
      });
      continue;
    }
    const neutralArms=!!p.unarmedPreview&&!p.down&&!p.surrender;
    if(neutralArms)
      desired=neutralMannequinWrist(sign as -1|1);
    const reachable=desired.distanceTo(shoulder)<=19.92;
    // Evaluate the true handle target even during the wind-up: easing the
    // arm from the weapon must not hide an unreachable world interaction.
    const contactDistance=i===0&&fullDoorContact?
      fullDoorContact.distanceTo(shoulder):0;
    if(i===0&&reaching&&(!reachable||contactDistance>19.92))
      r.reachRequest={kind:'door',distance:Math.max(
        desired.distanceTo(shoulder),contactDistance)};
    // Impossible interactions must report the need for repositioning, not
    // stretch a joint or rotate an arm through the upper torso.
    const wrist=clampReach(shoulder,desired,19.92);
    if(p.deterministic)arm.bend.set(3,-9,sign*.5);
    // The IK 'pole' is a bend DIRECTION, not a position. Using absolute
    // z=9 as a direction was abducting both elbows into chicken wings.
    // Convert the desired elbow destination to a shoulder-relative vector.
    // The same pose parameters that drive weapon-ready silhouettes now
    // drive each arm independently, including during interrupted blends.
    const corridor=elbowCorridor(handling,sign as -1|1,profile);
    const curatedSupport=i===0&&!releaseLeft&&relaxedLowReady>.08&&familyLow;
    const familyPole=curatedSupport?
      lowReadyElbowPole(shoulder,familyLow,0):null;
    const wanted=neutralArms?neutralMannequinElbowPole(sign as -1|1):
      familyPole?P(familyPole.x,familyPole.y,familyPole.z):
      P(corridor.x,corridor.y,corridor.z).sub(shoulder);
    if(carryTransitionActive&&carryTransitionBends){
      const destination=coupled?coupled.arms[i].bendPlane:wanted;
      wanted.copy(carryTransitionBends[i])
        .lerp(destination,carryTransitionAlpha).normalize();
    }
    let solved=solveTwoBone(shoulder,wrist,10,10,
      wanted,ARM_LIMITS,neutralArms?undefined:arm.bend,scratch.arms[i]);
    let dynamicAccepted=false;
    if(dynamicEnvelope&&!neutralArms&&!p.down&&!p.surrender&&
       !p.firing){
      const mode=reloadActive?'reload':p.aiming||handling==='ads'?
        'aim':reaching||throwActive?'interaction':'carry';
      const dynamic=solveV3DynamicArm({
        shoulder,wrist:desired,side:sign as -1|1,mode,
        envelope:dynamicEnvelope,preferredPole:wanted
      });
      v3DynamicReports.push({side:i===0?'support':'firing',
        status:dynamic.status,reason:dynamic.reason,
        candidates:dynamic.candidates,
        elbowDrop:dynamic.report.elbowDrop,
        outwardFlare:dynamic.report.outwardFlare,
        hardDepth:dynamic.report.hardDepth,
        quality:dynamic.report.quality,
        reachError:Math.max(0,desired.distanceTo(shoulder)-19.92),
        violations:[...dynamic.report.reasons],
        evaluations:dynamic.evaluations,softScale:dynamic.softScale});
      if(dynamic.solution){
        solved=dynamic.solution;dynamicAccepted=true;
      }
    }
    if(!dynamicAccepted&&!neutralArms&&!p.down&&!p.surrender){
      // Front-plate clearance must score BOTH sleeve segments. Avoiding just
      // the elbow point was letting the forearm pass straight through armor.
      const front=p.equipment?.slots.armor==='armor-carrier'?9.8:
        p.equipment?.slots.armor==='armor-soft'?8.8:7.1;
      const score=(candidate:typeof solved)=>armorArmIntrusion(
        shoulder,candidate.joint,candidate.effector,front)+
        (intersectsTorso(candidate.joint,.25)?2.5:0);
      let bestScore=score(solved);
      if(bestScore>.04){
        // Prefer a relaxed, downward/outboard AK-specific bend before the
        // generic plate avoidance candidate. Both retain the real wrist grip.
        const pole0=curatedSupport?
          lowReadyElbowPole(shoulder,familyLow,1):
          armorElbowPole(shoulder,sign as -1|1,0);
        const retry=solveTwoBone(shoulder,wrist,10,10,
          P(pole0.x,pole0.y,pole0.z),ARM_LIMITS,arm.bend,
          scratch.armRetry[i]);
        const retryScore=score(retry);
        if(retryScore+.015<bestScore){solved=retry;bestScore=retryScore;}
        const pole1=armorElbowPole(shoulder,sign as -1|1,1);
        const alternate=solveTwoBone(shoulder,wrist,10,10,
          P(pole1.x,pole1.y,pole1.z),ARM_LIMITS,arm.bend,
          scratch.armFallback[i]);
        const alternateScore=score(alternate);
        if(alternateScore+.015<bestScore){solved=alternate;bestScore=alternateScore;}
      }
    }
    r.elbowSpread[i]=Math.max(0,
      sign*(solved.joint.z-shoulder.z));
    arm.bend.copy(solved.bendPlane);
    arm.outOfReach=!reachable||!solved.reached||
      (i===0&&reaching&&contactDistance>19.92);
    if(!releaseLeft&&i===0)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    if(i===1&&!p.surrender)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    alignSegment(arm.upper,shoulder,solved.joint,scratch.sides[i]);
    alignSegment(arm.lower,solved.joint,solved.effector,scratch.sides[i]);
    arm.hand.position.copy(solved.effector);
    arm.hand.rotation.set(0,p.unarmedPreview||p.surrender?0:
      clamp(fit.rotation.y,-1,1),0);
  }
  r.root.userData.poseV3DynamicReport=p.poseV3Preview?
    v3DynamicReports:null;
  if(r.magazineHand.visible){
    // Magazine visual follows the *solved* support wrist. The original
    // magazine is hidden from the gun while it is in hand.
    r.magazineHand.position.copy(r.arms[0].hand.position);
    r.magazineHand.rotation.copy(r.arms[0].hand.rotation);
  }
  if(r.detachedMagazine.visible){
    // Meshes are magazine-feed-socket relative; the lips follow the
    // solved support wrist and return to their gun mount at insertion.
    r.detachedMagazine.position.copy(r.arms[0].hand.position);
    r.detachedMagazine.rotation.copy(fit.rotation);
    r.detachedMagazine.scale.set(data.lengthScale,1,1);
  }
  // The pose system is the final writer for actor tilts and reactions.
  // The scene controls XY world placement only, not anatomy or weapon pose.
  if(p.flashActive&&!p.down){
    r.legacyRoll+=.10*Math.sin(p.seconds*24);
    r.root.quaternion.copy(
      canonicalRootOrientation(r.legacyPitch,r.legacyYaw,r.legacyRoll));
  }
  if(p.surrender)r.chest.rotation.x=.15;
  else if(p.down){
    // Spine and neck settle independently; the fall isn't a single
    // rigid mannequin tipping around the operator origin.
    r.chest.rotation.x=-.18*Math.sin(Math.PI*downProgress)-.05;
    r.head.rotation.z=.13*Math.sin(Math.PI*downProgress);
  }
  // Wounds do not leave an incapacitated actor standing in the old
  // locomotion/ready pose. Final angles are deterministic from the hit.
  if(p.down){
    r.chest.rotation.y=0;
    r.head.rotation.x=0;
  }
  if(r.droppedGun.visible){
    // The world-space gun begins exactly in the last held grip and travels
    // continuously to the ground, horizontal beside the operator.
    r.root.updateMatrixWorld(true);
    const held=r.weapon.getWorldPosition(scratch.held);
    const orientation=r.weapon.getWorldQuaternion(scratch.orientation);
    const origin=r.root.getWorldPosition(scratch.origin);
    const side=p.downPose==='left'?-1:1;
    const sling=p.weaponConfiguration?.slots.sling==='sling-two-point'&&
     !p.surrender;
    // Attached guns stay near the hip instead of dropping far onto the floor.
    const rest=P(origin.x+(sling?4:9),sling?6:1.8,
     origin.z+side*(sling?5:11));
    const t=smooth((downProgress-.30)/.70);
    const location=held.lerp(rest,t);
    r.droppedGun.position.copy(r.legacyFrame.worldToLocal(location));
    const flat=scratch.flat.setFromAxisAngle(scratch.vertical,
      -p.heading+side*.18);
    orientation.slerp(flat,t);
    const inverse=r.legacyFrame.getWorldQuaternion(scratch.inverse).invert();
    r.droppedGun.quaternion.copy(inverse.multiply(orientation));
  }
  // Fabric loop follows the exact solved weapon rather than floating as a
  // rigid receiver part. The same deterministic calculation works in replay.
  const slingEquipped=p.weaponConfiguration?.slots.sling==='sling-two-point'&&
   !p.surrender;
  for(const mesh of r.slingStraps)mesh.visible=!!slingEquipped;
  if(slingEquipped){
   const gun=r.droppedGun.visible?r.droppedGun:r.weapon;
   const scale=r.weapon.scale.x;
   let rear:THREE.Vector3,front:THREE.Vector3;
   if(r.droppedGun.visible){
    r.root.updateMatrixWorld(true);
    rear=r.chest.worldToLocal(gun.localToWorld(P(-9,-.4,3)));
    front=r.chest.worldToLocal(gun.localToWorld(P(10,-.4,3)));
   }else{
    rear=P(-9*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
    front=P(10*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
   }
   const sway=Math.sin(p.stride*Math.PI*2)*Math.min(1,physicalSpeed/80)*.6;
   const points=[rear,P(-2.5,4.5,10.1),P(1.5+sway,-5.8,11.5),front];
   const vertical=scratch.vertical;
   for(let i=0;i<r.slingStraps.length;i++){
    const start=points[i],end=points[i+1];
    const delta=scratch.slingDelta.copy(end).sub(start),length=delta.length();
    const mesh=r.slingStraps[i];
    mesh.position.copy(start).addScaledVector(delta,.5);
    mesh.scale.set(1,Math.max(.1,length),1);
    mesh.quaternion.setFromUnitVectors(vertical,delta.normalize());
   }
  }
  if(p.unarmedPreview){
    r.weapon.visible=false;r.droppedGun.visible=false;
    r.magazineHand.visible=false;r.magazineInserted.visible=false;
    r.detachedMagazine.visible=false;
    for(const sling of r.slingStraps)sling.visible=false;
  }
  // Shader uniforms follow the existing IK without CPU ray tracing.
  updateOperatorPoseCavity(r.poseCavity,r.arms,r.elbowSpread,
   p.posture,p.stride,p.down,
   Number(r.root.userData.fieldworkCavityQuality??1));
  r.lastPose={...p};r.lastTime=p.seconds;
}
