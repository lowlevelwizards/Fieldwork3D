/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {CORE_TORSO_CONTACT} from './operator-garment-contact-surface.ts';
import {operatorPixelTextures,type PixelSurface} from './rendering/pixel-materials.ts';
import {canonicalRootOrientation,LEGACY_FRAME_YAW,createCanonicalAttachment} from './operator-axis-convention.ts';
import {type PrecontactStyle} from './breach-idle-life.ts';
import type {WeaponId} from './breach-combat.ts';
import {createFootstepScheduler,type FootstepScheduler}
  from './breach-footsteps.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import {BOOT_FOREFOOT_OFFSET} from './breach-gait-geometry.ts';
import {operatorMotionTraits} from './breach-operator-personality.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_HEIGHT} from './breach-leg-geometry.ts';
import {type BashRole} from './breach-contact-reactions.ts';
import {type ReloadMode} from './breach-magazines.ts';
import {type V3ReloadCorridorProfile,type V3MagazinePalm} from './breach-pose-v3-reload-choreography.ts';
import {type V3ReloadHold} from './breach-pose-v3-reload-weapon.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import type {HandlingTransition} from './breach-handling-transition.ts';
import {type FallPose,type WoundRegion}
  from './breach-wounds.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {type WardrobeOptions} from './operator-wardrobe-data.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {enableBakedGearAO} from './operator-baked-gear-ao.ts';
import {createOperatorPoseCavity,type OperatorPoseCavity} from './operator-pose-cavity-lighting.ts';
import {mapSkinReceiverAtlas,headwearCastShadowAtlas,collarCastShadowAtlas} from './operator-baked-shadow-maps.ts';
import type {CarryLocation,CarryPlacement} from './equipment-carry-placement.ts';
import {createOperatorVisualKit,type OperatorVisualKit} from './operator-visual-kit.ts';
import {createGarmentFitAnchors,type GarmentFitAnchors}
 from './operator-garment-fit.ts';
import {createOperatorEquipmentDetails,type OperatorEquipmentDetails} from './operator-equipment-details.ts';
import {type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {type Handling,type HandlingIntent}
  from './breach-weapon-pose.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  ankleLink:THREE.Mesh;
  anchor:THREE.Vector3;swinging:boolean;
  bend:THREE.Vector3;outOfReach:boolean;};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh;
  bend:THREE.Vector3;outOfReach:boolean};
export type OperatorPose={
  /** V3 whole-arm fitting; enabled by the live tactical renderer. */
  poseV3Preview?:boolean;
  /** Diagnostic-only: compare against the original strict contact budget. */
  poseV3StrictContact?:boolean;
  /** V4 rifle, hand, magazine and controls; enabled for live reloads. */
  poseV4ReloadPreview?:boolean;
  /** False in live gameplay: skip Lab-only debug arrays and snapshots. */
  poseDiagnostics?:boolean;
  /** Opt-in Lab reload corridor comparison; never read by game simulation. */
  poseV3ReloadCorridor?:V3ReloadCorridorProfile;
  /** B19 fixed-profile offline handling audition; only read in V3 Lab. */
  poseV3ReloadHold?:V3ReloadHold;
  /** B22 magazine-body grip, explicitly Lab-only and replay-time pure. */
  poseV3MagazinePalm?:V3MagazinePalm;
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Presentation-only clock advances during tactical pause, never the motor. */
  idleLifeSeconds?:number;
  /** Render-only, static armed pre-contact nuance. Never changes handling. */
  precontact?:PrecontactStyle;
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
  shortCompression?:number;
  blocked?:boolean;footAllowed?:(point:{x:number;y:number})=>boolean;
  gait?:'walk'|'run'|'pie'|'squeeze';
  /** 0-1 motor-owned vault phase, also restored during replay. */
  traversalProgress?:number;
  equipment?:EquipmentLoadout;flashCharges?:number;
  medicalCarryLocation?:CarryLocation;utilityCarryLocation?:CarryLocation;
  magazineCarryLocations?:readonly CarryLocation[];
  /** Simulation-owned IDs and actual stowage, used for V4 handoff ONLY. */
  magazineCarryItems?:readonly Pick<CarryPlacement,'id'|'kind'|'location'>[];
  reloadSelectedMagazineId?:string|null;
  weaponConfiguration?:WeaponConfiguration;
  weaponLightOn?:boolean;
  treatmentActive?:boolean;treatmentProgress?:number;
  lockpickActive?:boolean;lockpickProgress?:number;
  interactionCrouch?:number;
  treatmentPoint?:{x:number;y:number};
  /** Opt-in to contact-position weight transfer for lab candidate only. */
  hybridSupport?:boolean;
  acceleration?:number;
  aimBlend?:number;recoil?:number;shotHeading?:number;
  hitFade?:number;hitAge?:number;downProgress?:number;flashActive?:boolean;
  hitRegion?:WoundRegion;hitYaw?:number;hitSeverity?:number;
  downPose?:FallPose;downClearance?:number;
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
  bodycamChest:THREE.Object3D;bodycamHelmet:THREE.Object3D;
  weapon:THREE.Group;droppedGun:THREE.Group;feet:Foot[];arms:Arm[];
  magazineInserted:THREE.Mesh;magazineHand:THREE.Mesh;
  detachedMagazine:THREE.Group;
  /** B29 mechanical silhouette, preview only; no shot/collision writes. */
  reloadControlMesh:THREE.Mesh;
  medicalItem:THREE.Mesh;
  weaponBody:THREE.Group;droppedWeaponBody:THREE.Group;
  weaponAccessories:THREE.Group;droppedAccessories:THREE.Group;
  weaponLightLens:THREE.Object3D|null;droppedLightLens:THREE.Object3D|null;
  weaponLensMaterial:THREE.MeshStandardMaterial;
  slingStraps:THREE.Mesh[];
  visualWeapon:WeaponId|null;visualWeaponConfiguration?:WeaponConfiguration;
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
  autoHandling:(HandlingTransition&{at:number;duration?:number})|null;
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
  const bodycamChest=new THREE.Object3D();
  bodycamChest.name='fieldwork-replay-bodycam-chest';
  bodycamChest.position.set(9.5,1.4,0);chest.add(bodycamChest);
  const bodycamHelmet=new THREE.Object3D();
  bodycamHelmet.name='fieldwork-replay-bodycam-helmet';
  bodycamHelmet.position.set(8.5,2.4,0);head.add(bodycamHelmet);
  const headCanonicalFrame=createCanonicalAttachment(head);
  root.quaternion.copy(canonicalRootOrientation(0,0,0));
  const cloth=mat(side==='red'?0x936e5b:
    id==='moss'?0x80826b:id==='ash'?0x8e846e:
    id==='vale'?0x687c8d:0x6f9185,'fabric');
  const trousers=cloth.clone();
  const boot=mat(0x313935,'rubber'),vest=mat(0x43504b,'fabric'),
    skin=mat(0xb29b83),steel=mat(0x414846,'metal');
  // Studio-only style classifier; no tactical material or physics change.
  steel.userData.fieldworkSpecRim=true;
  const packFabric=vest.clone(),gearFabric=vest.clone(),
    headCloth=cloth.clone(),headArmor=vest.clone();
   // Only textiles are unfolded across adjacent faces; leave rubber, steel,
   // skin and the approved, separately authored headwear atlas untouched.
   for(const material of [cloth,trousers,vest,packFabric,gearFabric,
     headCloth])
    material.userData.fieldworkFabric=true;
   // A helmet fabric/liner tint may share the armor palette, but must NOT
   // opt into garment UV remapping (fieldworkFabric has gameplay meaning).
   headArmor.userData.fieldworkStudioSoftGear=true;
   // Fixed grayscale AO uses existing textile shaders and textures.
   for(const kitMaterial of [
     cloth,trousers,vest,packFabric,gearFabric,headCloth,headArmor
    ])enableBakedGearAO(kitMaterial);
  hip.position.y=LEG_HIP_HEIGHT;
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
  // Explicit skin identity for the Studio-only faux subsurface light band.
  // Do not infer skin from diffuse RGB; complexions remain freely editable.
  for(const m of [skin,faceSkin,neckSkin])m.userData.fieldworkStudioSkin=true;
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
  // R7.11 Studio-only form-shading masks. Mark skeletal anchors instead of
  // guessing Y thresholds: trousers/thighs and sleeves attached to the bone
  // inherit the exclusion, while shins, hands/gloves and boots opt back in.
  // These annotations never change animation transforms or combat materials.
  for(const foot of feet){
    foot.upper.userData.fieldworkStudioHeightRole='exclude';
    foot.lower.userData.fieldworkStudioHeightRole='include';
    foot.shoe.userData.fieldworkStudioHeightRole='include';
    foot.ankleLink.userData.fieldworkStudioHeightRole='include';
  }
  for(const arm of arms){
    arm.upper.userData.fieldworkStudioHeightRole='exclude';
    arm.lower.userData.fieldworkStudioHeightRole='exclude';
    arm.hand.userData.fieldworkStudioHeightRole='include';
  }
  weapon.position.set(8,-5,0);
  // Real weapon-specific silhouettes, using the same receiver-local grip and
  // muzzle axes as the fixed-step shot-time solver. Built only on weapon swap.
  // Do not briefly spawn obsolete/default gun geometry; the first pose
  // builds the actual equipped platform once for held and dropped copies.
  const weaponBody=new THREE.Group();
  const droppedWeaponBody=new THREE.Group();
  const weaponAccessories=new THREE.Group(),droppedAccessories=new THREE.Group();
  const weaponLensMaterial=mat(0xb7e6df);
  weaponLensMaterial.emissive.setHex(0x7fdac9);
  weaponLensMaterial.emissiveIntensity=.90;
  // Mark the whole firearm silhouette, optic/mount attachments and detachable
  // magazines as specular highlights for the opt-in Studio art audition.
  weapon.userData.fieldworkWeaponPresentation=true;
  droppedGun.userData.fieldworkWeaponPresentation=true;
  weapon.userData.fieldworkRimRegion='hard-shell';
  droppedGun.userData.fieldworkRimRegion='hard-shell';
  weapon.add(weaponBody,weaponAccessories);
  droppedGun.add(droppedWeaponBody,droppedAccessories);
  // Three geometry-reused fabric spans connect gun mounts with shoulder
  // routing. No ropes, IK targets, simulated joints or per-frame geometry.
  const slingStraps=[0,1,2].map(()=>{
   const strap=block(chest,0,0,0,.8,1,.7,vest);
   strap.castShadow=false;strap.receiveShadow=false;strap.visible=false;
   return strap;
  });
  // Chunky symbolic control; x/y/z always come from real receiver socket.
  // Keep distinct from the built weapon silhouette and any ballistic mesh.
  const reloadControlMesh=block(weapon,0,0,0,1.55,1.20,1.50,steel);
  reloadControlMesh.name='v4-moving-operating-handle';
  reloadControlMesh.castShadow=false;
  reloadControlMesh.visible=false;
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
    bodycamChest,bodycamHelmet,
    reloadControlMesh,
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
    visualWeapon:null,visualWeaponConfiguration:undefined,
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

/** Compatibility entrypoint. All pose evaluation is presentation-owned. */
export {poseOperator} from './breach-operator-animation-controller.ts';
