/** Arsenal M2.2: pure, conservative attachment-fit preview over M2.1's
 * physically authored contacts. This is NOT live eligibility/persistence yet.
 * No Three.js, DOM, game ballistics, inventory mutation or implicit part swap.
 *
 * A fit is valid only on an installed modeled interface, with the required
 * support points, an unblocked mounting footprint, and unoccupied space.
 * Visual dimensions are Fieldwork art units, not rail manufacturing standards.
 */
import {WEAPON_ATTACHMENTS,compatibleWeaponAttachment,
 type WeaponConfiguration,type WeaponAttachmentSlot}
 from '../../equipment-weapon-assemblies.ts';
import {opticProfile} from './optic-profiles.ts';
import {opticEyeBoxCheck} from './weapon-optic-eye-box.ts';
import {physicalWeaponMountSlots,
 type PhysicalMountSlot,type PhysicalMountFace}
 from './weapon-physical-mount-slots.ts';

export type MountFitReason=
 'unknown-attachment'|'no-physical-interface'|'missing-adapter'|
 'missing-four-claw-contact'|'insufficient-support'|'insufficient-clearance'|
 'forward-eye-relief'|'eye-alignment'|'mount-conflict'|'occupied';
export type PhysicalAttachmentPlacement=Readonly<{
 attachmentId:string;attachmentSlot:WeaponAttachmentSlot;
 /** Owner and exact face are stable even if candidate order changes. */
 ownerPartId:string;surfaceId:string;face:PhysicalMountFace;
 groupId:string;standard:'picatinny'|'hk-claw'|'ak-side-dovetail';
 supportIds:readonly string[];
 /** Center of actual visible accessory; attachment feet may be offset in X. */
 x:number;y:number;z:number;
 /** Occupied art-body envelope; not the narrower mounting clamp. */
 clearanceStartX:number;clearanceEndX:number;
}>;
export type PhysicalAttachmentFit=Readonly<{
 attachmentId:string;
 feasible:boolean;
 options:readonly PhysicalAttachmentPlacement[];
 reasons:readonly MountFitReason[];
}>;
export type PhysicalMountBuildPlan=Readonly<{
 placements:readonly PhysicalAttachmentPlacement[];
 unresolved:readonly PhysicalAttachmentFit[];
}>;

type Footprint=Readonly<{
 slot:WeaponAttachmentSlot;
 role:'opticMount'|'optic'|'foregrip'|'light';
 standard:'picatinny'|'hk-claw'|'ak-side-dovetail';
 faces:readonly PhysicalMountFace[];
 /** Clamp support X relative to the *visual attachment center*.
  * Rails are simplified at miniature scale; teeth are contact anchors,
  * not literal pitch/spacing of a commercial rail system.
  */
 contactOffsets:readonly number[];
 /** Clamp half-length around each foot for continuous rails. */
 clampHalfX:number;
 /** If a visible base projects beyond the handguard, prevent false seating. */
 requireBaseWithinRail:boolean;
 baseHalfX:number;
 /** Body envelope used to flag adjacent attachment overlap. */
 bodyHalfX:number;
}>;

/** Widths/offsets follow the extant shared accessories builder:
 * reflex base width 4; magnified two ring brackets at -1.65/+1.45;
 * vertical grip base width 3.35; light bracket x-1.40 and width 2.25.
 * Avoid a per-optic or per-family hardcoded geometry guess elsewhere.
 */
const FOOTPRINTS:Readonly<Record<string,Footprint>>={
 'foregrip-handstop':{slot:'foregrip',role:'foregrip',standard:'picatinny',
  faces:['bottom'],contactOffsets:[0],clampHalfX:.40,
  requireBaseWithinRail:true,baseHalfX:1.18,bodyHalfX:1.18},
 'foregrip-vertical':{slot:'foregrip',role:'foregrip',standard:'picatinny',
  faces:['bottom'],contactOffsets:[0],clampHalfX:.50,
  requireBaseWithinRail:true,baseHalfX:1.675,bodyHalfX:1.675},
 'light-compact':{slot:'light',role:'light',standard:'picatinny',
  faces:['left','right'],contactOffsets:[-1.40],clampHalfX:1.125,
  requireBaseWithinRail:false,baseHalfX:2.65,bodyHalfX:2.68},
 'optic-hk-claw':{slot:'opticMount',role:'opticMount',standard:'hk-claw',
  faces:['left','right'],contactOffsets:[],clampHalfX:0,
  requireBaseWithinRail:false,baseHalfX:0,bodyHalfX:0},
 'optic-ak-side-picatinny':{slot:'opticMount',role:'opticMount',
  standard:'ak-side-dovetail',faces:['left'],contactOffsets:[0],
  clampHalfX:1.35,requireBaseWithinRail:true,
  baseHalfX:2.45,bodyHalfX:0}
};
/** Optic footprints come from M2.4 identity, never a second solver catalog. */
export const physicalAttachmentFootprint=(id:string):Footprint|undefined=>{
 const optic=opticProfile(id);
 if(optic&&optic.mount.standard!=='integrated')
  return {slot:'optic',role:'optic',standard:optic.mount.standard,
   faces:optic.mount.standard==='ak-side-dovetail'?['left']:['top'],
   contactOffsets:optic.mount.clampOffsetsX,
   clampHalfX:optic.mount.clampHalfX,
   requireBaseWithinRail:optic.mount.standard==='ak-side-dovetail',
   baseHalfX:optic.mount.baseHalfX,bodyHalfX:optic.visual.bodyHalfX};
 return FOOTPRINTS[id];
};

function samePlaceOccupied(place:PhysicalAttachmentPlacement,
 existing:readonly PhysicalAttachmentPlacement[]):boolean{
 return existing.some(other=>
  other.attachmentSlot!==place.attachmentSlot&&
  // The four-foot HK claw is structural hardware beneath the optic,
  // not an accessory body competing for its own bridge top.
  other.attachmentSlot!=='opticMount'&&
  // Only physically coincident outward faces can overlap in this first
  // conservative rail-level solver. Per-accessory 3D volumes come in M2.5.
  other.face===place.face&&
  Math.abs(other.y-place.y)<1.5&&Math.abs(other.z-place.z)<1.5&&
  other.clearanceStartX<place.clearanceEndX-.02&&
  place.clearanceStartX<other.clearanceEndX-.02);
}
const uniqueReasons=(items:MountFitReason[]):readonly MountFitReason[]=>
 [...new Set(items)];

function option(profile:Footprint,id:string,
 supports:readonly PhysicalMountSlot[],x:number,
 face:PhysicalMountFace,
 occupied:readonly PhysicalAttachmentPlacement[]):{
 placement:PhysicalAttachmentPlacement;blocked:boolean
 }{
 const source=supports[0];
 const placement:PhysicalAttachmentPlacement={
  attachmentId:id,attachmentSlot:profile.slot,
  ownerPartId:source.ownerPartId,surfaceId:source.surfaceId,
  face,groupId:source.groupId,standard:profile.standard,
  supportIds:supports.map(s=>s.id),
  x,y:source.y,z:source.z,
  clearanceStartX:x-profile.bodyHalfX,
  clearanceEndX:x+profile.bodyHalfX
 };
 return {placement,blocked:samePlaceOccupied(placement,occupied)};
}

const NONE=new Set([
 'optic-irons','optic-g36-integrated','optic-g36-single','optic-mount-none',
 'foregrip-none','light-none'
]);

/** Return all supportable placements; never equip an attachment.
 * `occupied` is the caller's already-accepted layout. The same logical
 * attachment slot can be replaced without colliding with itself.
 *
 * Distinguish 'no-physical-interface' from 'missing-adapter', so Arsenal
 * can propose a suitable *explicitly owned/paid* accessory later.
 */
export function physicalAttachmentFitOptions(config:WeaponConfiguration,
 attachmentId:string,
 occupied:readonly PhysicalAttachmentPlacement[]=[]):PhysicalAttachmentFit{
 const basic=WEAPON_ATTACHMENTS[attachmentId];
 const fail=(reason:MountFitReason):PhysicalAttachmentFit=>({
  attachmentId,feasible:false,options:[],reasons:[reason]});
 const profile=physicalAttachmentFootprint(attachmentId);
 if(!basic||!profile||
  !compatibleWeaponAttachment(config.weapon,basic.slot,attachmentId))
  return fail('unknown-attachment');
 if(!config.build)return fail('no-physical-interface');
 const optic=opticProfile(attachmentId);
 // One receiver dovetail, one occupant: an integral Russian side sight
 // and the separate side bridge are mutually exclusive.
 if(optic?.mount.standard==='ak-side-dovetail'&&
  config.slots.opticMount!=='optic-mount-none')
  return fail('mount-conflict');
 if(attachmentId==='optic-ak-side-picatinny'&&
  opticProfile(config.slots.optic)?.mount.standard==='ak-side-dovetail')
  return fail('mount-conflict');
 const mounted=physicalWeaponMountSlots(config.build,config.slots.opticMount);
 const support=mounted.filter(s=>s.role===profile.role&&
  s.standard===profile.standard&&profile.faces.includes(s.face));
 if(support.length===0){
  if(profile.role==='optic'&&
   mounted.some(s=>s.role==='opticMount'&&
    (s.standard==='hk-claw'||s.standard==='ak-side-dovetail'))&&
   !['optic-hk-claw','optic-ak-side-picatinny'].includes(config.slots.opticMount))
   return fail('missing-adapter');
  return fail('no-physical-interface');
 }
 const results:PhysicalAttachmentPlacement[]=[];
 const errors:MountFitReason[]=[];
 let physicallySupportable=0;
 if(profile.role==='opticMount'&&profile.standard==='ak-side-dovetail'){
  // One continuous left-side receiver dovetail is the physical foundation.
  // Its bridge is structural, so it does not obstruct its own top optic.
  const bar=support.find(s=>s.support==='dovetail-bar'&&s.face==='left'&&
   s.railEndX-s.railStartX>=4.90);
  if(!bar)return fail('insufficient-support');
  const center=bar.x;
  if(center-profile.baseHalfX<bar.railStartX-.001||
   center+profile.baseHalfX>bar.railEndX+.001)
   return fail('insufficient-clearance');
  const p=option(profile,attachmentId,[bar],center,'left',occupied);
  return {attachmentId,feasible:!p.blocked,
   options:p.blocked?[]:[p.placement],
   reasons:p.blocked?['occupied']:[]};
 }
 if(profile.role==='opticMount'){
  // The four distinct HK feet are one inseparable bridge. A single foot
  // must never imply that a complete claw adapter is supported.
  const feet=support.filter(s=>s.requiresGroup==='hk-claw-four-foot');
  const left=feet.filter(s=>s.face==='left');
  const right=feet.filter(s=>s.face==='right');
  if(left.length!==2||right.length!==2||
   new Set(feet.map(s=>s.id)).size!==4)
   return fail('missing-four-claw-contact');
  const x=(feet.reduce((sum,s)=>sum+s.x,0))/4;
  const first=feet[0];
  const p:PhysicalAttachmentPlacement={
   attachmentId,attachmentSlot:profile.slot,ownerPartId:first.ownerPartId,
   surfaceId:first.surfaceId,face:'top',groupId:first.surfaceId+':four-claw',
   standard:'hk-claw',supportIds:feet.map(s=>s.id),
   x,y:first.y,z:0,clearanceStartX:x,clearanceEndX:x
  };
  return {attachmentId,feasible:true,options:[p],reasons:[]};
 }
 const groups=new Map<string,PhysicalMountSlot[]>();
 for(const s of support){
  const candidates=groups.get(s.groupId)??[];
  candidates.push(s);groups.set(s.groupId,candidates);
 }
 for(const contacts of groups.values()){
  contacts.sort((a,b)=>a.x-b.x);
  const first=contacts[0],face=first.face;
  const minX=Math.max(...contacts.map(c=>c.railStartX));
  const maxX=Math.min(...contacts.map(c=>c.railEndX));
  if(first.support==='continuous-rail'){
   // Each M2.1 continuous slot is a coarse X candidate on one modeled
   // span. Do not mistake repeated overlapping full spans for three rails.
   for(const c of contacts){
    const center=c.x;
    const fits=profile.contactOffsets.every(offset=>
     center+offset-profile.clampHalfX>=minX-.001&&
     center+offset+profile.clampHalfX<=maxX+.001);
    const baseFits=!profile.requireBaseWithinRail||
     (center-profile.baseHalfX>=minX-.001&&
      center+profile.baseHalfX<=maxX+.001);
    if(!fits){errors.push('insufficient-support');continue;}
    if(!baseFits){errors.push('insufficient-clearance');continue;}
    physicallySupportable++;
    const p=option(profile,attachmentId,[c],center,face,occupied);
    const eye=optic?opticEyeBoxCheck(config,optic,p.placement):null;
    if(eye&&!eye.valid){errors.push(eye.reason??'eye-alignment');continue;}
    if(p.blocked)errors.push('occupied');
    else results.push(p.placement);
   }
  }else if(first.support==='rail-tooth'){
   // Clamp contacts on actual coarse teeth. The two optic rings must
   // meet two *separate* teeth; a magnified optic cannot balance on one.
   for(const anchor of contacts){
    const center=anchor.x-profile.contactOffsets[0];
    const matched:PhysicalMountSlot[]=[];
    for(const offset of profile.contactOffsets){
     const footX=center+offset;
     const foot=contacts.find(s=>!matched.includes(s)&&
      Math.abs(s.x-footX)<=.38);
     if(!foot)break;
     matched.push(foot);
    }
    if(matched.length!==profile.contactOffsets.length){
     errors.push('insufficient-support');continue;
    }
    const clampFits=profile.contactOffsets.every(offset=>
     center+offset-profile.clampHalfX>=minX-.001&&
     center+offset+profile.clampHalfX<=maxX+.001);
    const baseFits=!profile.requireBaseWithinRail||
     (center-profile.baseHalfX>=minX-.001&&
      center+profile.baseHalfX<=maxX+.001);
    if(!clampFits){errors.push('insufficient-support');continue;}
    if(!baseFits){errors.push('insufficient-clearance');continue;}
    physicallySupportable++;
    const p=option(profile,attachmentId,matched,center,face,occupied);
    const eye=optic?opticEyeBoxCheck(config,optic,p.placement):null;
    if(eye&&!eye.valid){errors.push(eye.reason??'eye-alignment');continue;}
    if(p.blocked)errors.push('occupied');
    else results.push(p.placement);
   }
  }
 }
 if(results.length){
  // Stable, reversible default preference; a user-facing position choice
  // is M2.7 and saved location identity is M2.6.
  const preferredX=optic?.preferredX[config.build.family]??
   WEAPON_ATTACHMENTS[attachmentId]?.mountX??0;
  results.sort((a,b)=>
   Math.abs(a.x-preferredX)-Math.abs(b.x-preferredX)||
   (a.face===b.face?0:a.face==='right'?-1:1)||
   a.x-b.x||a.groupId.localeCompare(b.groupId));
  return {attachmentId,feasible:true,options:results,reasons:[]};
 }
 // Invalid edge teeth should never obscure a *genuinely supportable*
 // position that was rejected only for occupancy or eye-box reasons.
 const primary:MountFitReason|undefined=physicallySupportable?
  errors.includes('occupied')?'occupied':
  errors.includes('forward-eye-relief')?'forward-eye-relief':
  errors.includes('eye-alignment')?'eye-alignment':undefined:undefined;
 return {attachmentId,feasible:false,options:[],
  reasons:primary?[primary]:
   uniqueReasons(errors.length?errors:['insufficient-support'])};
}

/** Preview only: resolve existing equipped accessories against authored
 * geometry without changing a V1/V2 recipe or removing incompatible legacy
 * equipment. Unresolved attachments are reported, not silently detached.
 */
export function previewPhysicalMountBuild(config:WeaponConfiguration):
 PhysicalMountBuildPlan{
 const placements:PhysicalAttachmentPlacement[]=[];
 const unresolved:PhysicalAttachmentFit[]=[];
 for(const slot of ['opticMount','optic','foregrip','light'] as const){
  const id=config.slots[slot];
  if(NONE.has(id))continue;
  const fit=physicalAttachmentFitOptions(config,id,placements);
  if(fit.feasible&&fit.options[0])placements.push(fit.options[0]);
  else unresolved.push(fit);
 }
 return {placements,unresolved};
}
