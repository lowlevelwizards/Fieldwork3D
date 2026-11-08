/** Rigid, shoulder-supported firearm geometry and feasible grip targets. */
import type {WeaponId} from './breach-combat.ts';
import {WEAPON_PLATFORMS,resolveWeaponAssembly,
 initialWeaponConfiguration,selectWeaponFamilyPreset,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import * as THREE from 'three';
import {stockPocket,anchorGap} from './breach-anatomy.ts';
import {M4A1_AUTHORED_SHORT,authoredShortPhase}
 from './breach-authored-m4a1-short-stock.ts';
import {shortStockReference,sameAuthoredReferenceBuild,
 transferShortStockPose} from './breach-authored-short-stock.ts';
import type {WorkbenchPose} from './operator-pose-workbench.ts';
import {handlingProfile} from './breach-handling-profiles.ts';
import {lowReadyFamilyFit,lowReadyPocket} from './breach-low-ready-family-fit.ts';
import {riflePoseContacts,supportContactAt}
 from './breach-weapon-contact-zones.ts';
export type Handling='low'|'high'|'ready'|'point'|'ads'|'short';
export type WeaponGrip={lengthScale:number;stockX:number;
  primaryX:number;primaryY:number;supportX:number;supportY:number};
/** Shared authored weapon metadata; no duplicate geometry offsets. */
/** The K's real rear cap must never be shouldered like a buttplate. */
export const stocklessMP5K=(config?:WeaponConfiguration):boolean=>
 config?.weapon==='smg'&&config.build?.parts.receiver==='hk-mp5k-stockless'&&
 config.build.parts.stock==='hk-mp5k-cap';
export const GRIPS:Record<WeaponId,WeaponGrip>=Object.fromEntries(
 (Object.keys(WEAPON_PLATFORMS) as WeaponId[]).map(id=>{
  const p=WEAPON_PLATFORMS[id];
  return [id,{lengthScale:p.lengthScale,stockX:p.stockX,
   primaryX:p.primaryX,primaryY:p.primaryY,
   supportX:p.supportX,supportY:p.supportY}];
 })) as Record<WeaponId,WeaponGrip>;
export const weaponGrips=(id:WeaponId,configuration?:WeaponConfiguration,
 handling?:Handling,relaxedWeight=0):WeaponGrip=>{
 if(!configuration||configuration.weapon!==id){
  const base=GRIPS[id];
  // Classic weapon IDs use the same compact receiver/magwell hold.
  // Previously only modular builds brought the support palm inward.
  return handling==='short'?{...base,supportX:Math.min(base.supportX,-3.0)}:base;
 }
 const a=resolveWeaponAssembly(configuration);
 // The low-ready grip is presentation-only, not a shot-time muzzle change.
 const low=handling==='low'?lowReadyFamilyFit(configuration):null;
 const w=clamp(relaxedWeight,0,1);
 // The receiver/magwell is NOT the default support-palm socket. Start
 // with a reachable position on the actual handguard; the coordinated
 // fitter may slide farther forward if the armor/arm geometry permits.
 // This is shared with the shot-time rigid assembly, never visual-only.
 const contact=riflePoseContacts(id,configuration);
 const baseline=contact?supportContactAt(contact.support,.32):null;
 const supportX=low?Math.max(low.minSupportX,
   a.supportX-low.supportBack*w):
   handling==='short'?Math.min(a.supportX,-3.0):
   Math.max(a.supportX,baseline?.x??a.supportX);
 return {lengthScale:a.lengthScale,stockX:a.stockX,
  primaryX:a.primaryX,primaryY:a.primaryY,
  supportX,supportY:low?
    a.supportY-(low?.supportDown??0)*w:
    handling==='short'?a.supportY:
    baseline?.y??a.supportY};
};
// Cache exact and adapted stock/arm endpoints together: the rig, rendered
// weapon and shot-time muzzle MUST read the same recipe. The heavy transfer
// runs at most once per immutable configuration, never per animation frame.
const authoredPoseCache=new WeakMap<WeaponConfiguration,Readonly<WorkbenchPose>>();
const classicPoseCache=new Map<WeaponId,Readonly<WorkbenchPose>>();
const M4_REFERENCE_CONFIG=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const AK_REFERENCE_CONFIG=selectWeaponFamilyPreset(
 initialWeaponConfiguration('rifle'),'ak-akm');
export function liveShortStockPose(weapon:WeaponId,
 configuration?:WeaponConfiguration):Readonly<WorkbenchPose>{
 const valid=configuration?.weapon===weapon?configuration:undefined;
 if(valid){
  const cached=authoredPoseCache.get(valid);
  if(cached)return cached;
 }
 const cachedClassic=!valid?classicPoseCache.get(weapon):undefined;
 if(cachedClassic)return cachedClassic;
 const source=shortStockReference(weapon,valid);
 if(sameAuthoredReferenceBuild(source,valid)){
  if(valid)authoredPoseCache.set(valid,source);
  return source;
 }
 const sourceConfiguration=source.preset==='ar-m4a1'?
  M4_REFERENCE_CONFIG:AK_REFERENCE_CONFIG;
 const sourceGrip=weaponGrips(source.weapon,sourceConfiguration,'ready');
 const targetGrip=weaponGrips(weapon,valid,'ready');
 const pose=transferShortStockPose(source,sourceGrip,targetGrip,
  weapon,valid?.build?.family??weapon);
 if(valid)authoredPoseCache.set(valid,pose);
 else classicPoseCache.set(weapon,pose);
 return pose;
}
export type HandlingIntent='move'|'run'|'look'|'pie'|'door'|'hold'|'engage'|'squeeze'|'entry'|'stack'|'reload'|'treat'|'traverse';
/** Pure context-based handling selection shared with shot-time geometry.
 * Optional hysteresis only affects passive ready states, never combat.
 * A physically blocked muzzle has absolute priority.
 */
export function handlingPose(input:{aim:number;moving:number;
  obstruction:boolean;friendlyNear:boolean;intent?:HandlingIntent;
  threatRange?:number|null;weapon?:WeaponId;
  previous?:Handling;heldFor?:number}):Handling{
  if(input.obstruction||input.intent==='squeeze')return 'short';
  // Never display ADS or point shooting while sprinting, climbing,
  // manipulating a magazine or treating. These activities prohibit
  // normal ignition even if the old aim meter has not yet decayed.
  // Squeeze / blocked barrel is a stronger physical short-stock case.
  if(input.intent==='run'||input.intent==='traverse'||
     input.intent==='reload'||input.intent==='treat')return 'low';
  const near=input.weapon==='shotgun'?86:
    input.weapon==='smg'?100:74;
  const closeThreat=input.threatRange!==undefined&&
    input.threatRange!==null&&input.threatRange<=near;
  if(closeThreat&&input.aim>=.34)return 'point';
  if(input.aim>=.82)return 'ads';
  if(input.aim>=.20)return 'point';
  let next:Handling='ready';
  if((input.intent==='door'||input.intent==='stack'||
      input.intent==='entry')&&input.friendlyNear)next='high';
  else if(input.intent==='entry'||input.intent==='stack'||
          input.intent==='door'||input.intent==='pie'||
          input.intent==='look'||input.intent==='hold'||
          input.intent==='engage')next='ready';
  else if(input.friendlyNear)next='low';
  else if(input.moving>.32)next='low';
  // Ignore brief passive-pose threshold flicker; never delay urgent combat
  // or physical short-stock clearance. Replay omits previous for purity.
  if(input.previous&&input.previous!==next&&
     (input.heldFor??Infinity)<.16&&input.aim<.20)
    return input.previous;
  return next;
}
/** Shared unblocked source of a progressively compressed stock. */
export function shortStockSourceHandling(aim:number,moving:number,
 weapon:WeaponId,friendlyNear=false):Handling{
 return handlingPose({aim:moving>.48?0:aim,moving,obstruction:false,
  friendlyNear,weapon});
}
export function clampReach(from:THREE.Vector3,target:THREE.Vector3,
  length:number):THREE.Vector3{
  const delta=target.clone().sub(from);
  if(delta.lengthSq()>length*length)
    return from.clone().add(delta.normalize().multiplyScalar(length));
  return target.clone();
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const LIMIT=19.92;
export type WeaponFit={
  origin:THREE.Vector3;rotation:THREE.Euler;
  stock:THREE.Vector3;primary:THREE.Vector3;support:THREE.Vector3;
  /** A two-handed fit exists; otherwise the support arm switches to guard. */
  twoHanded:boolean;primaryReachable:boolean;handling:Handling;
  /** Positive when a non-reload interaction explicitly releases the support grip. */
  contactError:number;
  stockError:number;
};
export type WeaponPoseInput={weapon:WeaponId;handling:Handling;
 configuration?:WeaponConfiguration;
  /** Fire direction in chest-local space. */
  yaw:number;recoil:number;aimBlend?:number;
  swayYaw?:number;swayPitch?:number;
  /** Legacy authored pull-back; live wall handling now uses compression. */
  clearanceRetraction?:number;
  /** Wall proximity 0..1; omitted for manually authored full short-stock. */
  shortCompression?:number;
  shortFrom?:Handling;
  /** Exact equipment-driven stock seat shared with shot-time muzzle. */
  armorPush?:number;
  /** Visual-only low-ready blend; never set by shot-time muzzle code. */
  relaxedLowReady?:number;
  blendFrom?:Handling;blendAlpha?:number;
  blendSnapshot?:{origin:THREE.Vector3;rotation:THREE.Euler}};
/** Rigid contact fit in chest-local space. The candidate search uses scalar
 * maths: allocating dozens of vectors per actor per render caused mobile GC
 * spikes. Only the winning solution becomes Three.js geometry.
 */
export function fitWeaponPose(input:WeaponPoseInput):WeaponFit{
  // User-authored M4A1/AKM pose family. All physical weapon builds have
  // one cached underarm tuck, derived from their *real* grip sockets.
  // Retain the one true rigid weapon transform for rendering and firing.
  if(input.handling==='short'){
    const authored=liveShortStockPose(input.weapon,input.configuration);
    const phase=authoredShortPhase(input.shortCompression);
    const source=input.shortFrom&&input.shortFrom!=='short'?
      input.shortFrom:'ready';
    const from=fitWeaponPose({...input,handling:source,
      shortCompression:undefined,clearanceRetraction:0,
      blendFrom:undefined,blendSnapshot:undefined,blendAlpha:undefined});
    if(phase<=0)return {...from,handling:'short'};
    const data=weaponGrips(input.weapon,input.configuration,'ready');
    const deg=THREE.MathUtils.degToRad;
    const angles=authored.weaponRotation;
    const targetRotation=new THREE.Euler(deg(angles[0]),
      input.yaw+deg(angles[1]),deg(angles[2]),'XYZ');
    const requestedStock=authored.targets.stock;
    const targetStock=new THREE.Vector3(...requestedStock);
    const stockLocal=new THREE.Vector3(data.stockX*data.lengthScale,0,0);
    const targetOrigin=targetStock.sub(
      stockLocal.clone().applyEuler(targetRotation));
    const origin=from.origin.clone().lerp(targetOrigin,phase);
    const q=new THREE.Quaternion().setFromEuler(from.rotation)
      .slerp(new THREE.Quaternion().setFromEuler(targetRotation),phase);
    const rotation=new THREE.Euler().setFromQuaternion(q,'XYZ');
    const point=(x:number,y:number,z:number)=>
      new THREE.Vector3(x*data.lengthScale,y,z)
        .applyEuler(rotation).add(origin);
    const stock=point(data.stockX,0,0);
    const primary=point(data.primaryX,data.primaryY,1.8);
    const support=point(data.supportX,data.supportY,-1.6);
    const elbowTarget=(name:'firingHand'|'supportHand')=>
      new THREE.Vector3(...authored.targets[name]);
    const primaryGap=primary.distanceTo(elbowTarget('firingHand'));
    const supportGap=support.distanceTo(elbowTarget('supportHand'));
    return {origin,rotation,stock,primary,support,handling:'short',
      twoHanded:primaryGap<1.5&&supportGap<1.5,
      primaryReachable:primaryGap<1.5,
      // Report any gap rather than forcing the author's wrists to follow
      // a different inferred socket. The pose was approved visually.
      contactError:phase*(primaryGap+supportGap),
      stockError:stock.distanceTo(new THREE.Vector3(...requestedStock))};
  }
  // The short-stock butt is pulled BACK from the ordinary shoulder socket
  // into an independent underarm/waist contact. Gradually lower the muzzle
  // while moving the support palm back to the receiver/magwell. Both hands
  // remain on the same rigid firearm; IK uses each interpolated wrist.
  if(input.handling==='short'&&input.shortCompression!==undefined){
    const q=clamp(input.shortCompression,0,1),t=q*q*(3-2*q);
    const clean={...input,shortCompression:undefined,
      clearanceRetraction:0,blendFrom:undefined,
      blendSnapshot:undefined,blendAlpha:undefined};
    if(t<1){
      const source=input.shortFrom&&input.shortFrom!=='short'?
        input.shortFrom:'ready';
      const from=fitWeaponPose({...clean,handling:source});
      if(t<=0)return {...from,handling:'short'};
      const to=fitWeaponPose({...clean,handling:'short'});
      const origin=from.origin.clone().lerp(to.origin,t);
      const q0=new THREE.Quaternion().setFromEuler(from.rotation)
        .slerp(new THREE.Quaternion().setFromEuler(to.rotation),t);
      const rotation=new THREE.Euler().setFromQuaternion(q0,'XYZ');
      const first=weaponGrips(input.weapon,input.configuration,source);
      const last=weaponGrips(input.weapon,input.configuration,'short');
      const point=(a:number,b:number,y:number,z:number)=>
        new THREE.Vector3((a+(b-a)*t)*last.lengthScale,y,z)
          .applyEuler(rotation).add(origin);
      const stock=point(first.stockX,last.stockX,0,0);
      const primary=point(first.primaryX,last.primaryX,
        first.primaryY+(last.primaryY-first.primaryY)*t,1.8);
      const support=point(first.supportX,last.supportX,
        first.supportY+(last.supportY-first.supportY)*t,-1.6);
      const rightGap=Math.max(0,primary.distanceTo(
        new THREE.Vector3(1,4,7))-LIMIT);
      const leftGap=Math.max(0,support.distanceTo(
        new THREE.Vector3(1,4,-7))-LIMIT);
      return {...to,origin,rotation,stock,primary,support,
        handling:'short',twoHanded:rightGap===0&&leftGap===0,
        primaryReachable:rightGap===0,contactError:rightGap+leftGap,
        stockError:from.stockError*(1-t)+to.stockError*t};
    }
    return fitWeaponPose({...clean,handling:'short'});
  }
  if((input.blendFrom||input.blendSnapshot)&&input.blendAlpha!==undefined){
    const from=input.blendSnapshot??fitWeaponPose({...input,
      handling:input.blendFrom!,blendFrom:undefined,
      blendSnapshot:undefined,blendAlpha:undefined});
    const to=fitWeaponPose({...input,blendFrom:undefined,
      blendSnapshot:undefined,blendAlpha:undefined});
    const t=clamp(input.blendAlpha,0,1);
    const origin=from.origin.clone().lerp(to.origin,t);
    const q=new THREE.Quaternion().setFromEuler(from.rotation);
    q.slerp(new THREE.Quaternion().setFromEuler(to.rotation),t);
    const rotation=new THREE.Euler().setFromQuaternion(q,'XYZ');
    const data=weaponGrips(input.weapon,input.configuration,
      input.handling,input.relaxedLowReady);
    const point=(x:number,y:number,z:number)=>new THREE.Vector3(
      x*data.lengthScale,y,z).applyEuler(rotation).add(origin);
    const stock=point(data.stockX,0,0);
    const primary=point(data.primaryX,data.primaryY,1.8);
    const support=point(data.supportX,data.supportY,-1.6);
    const right=primary.distanceTo(new THREE.Vector3(1,4,7)),
      left=support.distanceTo(new THREE.Vector3(1,4,-7));
    return {...to,origin,rotation,stock,primary,support,
      twoHanded:right<=LIMIT&&left<=LIMIT,
      primaryReachable:right<=LIMIT,
      contactError:Math.max(0,right-LIMIT)+Math.max(0,left-LIMIT),
      stockError:stocklessMP5K(input.configuration)?0:
        anchorGap(stock,stockPocket(input.handling,input.armorPush))};
  }
  const data=weaponGrips(input.weapon,input.configuration,
     input.handling,input.relaxedLowReady),scale=data.lengthScale;
  const stockless=stocklessMP5K(input.configuration);
   const relaxed=input.handling==='low'?
     lowReadyFamilyFit(input.configuration):null;
   const relaxedWeight=clamp(input.relaxedLowReady??0,0,1);
  // Preserve the physical barrel's requested yaw even if the pelvis/chest
  // lag behind during a pivot. Clamping here made visible guns aim sideways
  // while simulation ballistics continued toward the actual target.
  const requestedYaw=input.yaw+(input.swayYaw??0)+
     (relaxed?.carryYaw??0)*relaxedWeight;
  const yaw=Math.atan2(Math.sin(requestedYaw),Math.cos(requestedYaw));
  const recoilX=clamp(input.recoil,0,5);
  const recoilY=Math.min(1.1,Math.max(0,input.recoil)*.2);
  // Never replace a named silhouette with an unrelated fallback.
  // IK infeasibility is exposed through contactError for the Lab.
  const selection:Handling[]=[input.handling];
  let bestScore=Infinity;
  let best:{sx:number;sy:number;sz:number;mode:Handling;
    yaw:number;roll:number;stock:[number,number,number];
    primary:[number,number,number];support:[number,number,number];
    twoHanded:boolean;primaryReachable:boolean;
    contactError:number}|null=null;
  for(const mode of selection){
    const profile=handlingProfile(mode,input.weapon);
    const aim=input.aimBlend;
    // Continuous keyed shoulder posture instead of snapping between
    // high, point and ADS at an arbitrary threshold.
    const base=profile.pitch;
    // Actual gameplay aim is a continuous presentation parameter. Short
    // stocking is an explicit collision response and remains compressed.
    // Shared by authoritative muzzle construction and visible firearm.
    const blendAim=Math.max(0,Math.min(1,aim??0));
    const roll=aim===undefined||mode==='short'?base:
      base*(1-blendAim)+
      (blendAim<.82?handlingProfile('point',input.weapon).pitch:
        handlingProfile('ads',input.weapon).pitch)*blendAim;
    const physicalRoll=roll+(input.swayPitch??0);
    const sr=Math.sin(physicalRoll),cr=Math.cos(physicalRoll);
    // The buttplate follows the selected contact: upper-chest for normal
    // poses, right underarm beside the waist for SHORT. Aim yaw stays true.
    const normalPocket=lowReadyPocket(stockPocket(mode,input.armorPush),relaxed,
      mode==='low'?relaxedWeight:0);
    // Low-ready must use its own stock pocket even when live aimBlend=0.
    const shoulderPocket=input.aimBlend===undefined||mode==='short'||
      mode==='low'?normalPocket:{
        x:stockPocket('ready',input.armorPush).x+
          (stockPocket('ads',input.armorPush).x-stockPocket('ready',input.armorPush).x)*blendAim,
        y:stockPocket('ready',input.armorPush).y+
          (stockPocket('ads',input.armorPush).y-stockPocket('ready',input.armorPush).y)*blendAim,
        z:normalPocket.z
      };
    // The MP5K stockless cap rests forward and inboard of shoulder, not in
    // the invisible stock socket. Both hands remain on their true weapon grips.
    const contactPocket=stockless?{
      x:shoulderPocket.x+4.20,y:shoulderPocket.y-.35,
      z:shoulderPocket.z-1.10
    }:shoulderPocket;
    for(const offset of (input.aimBlend??0)>=.20?[0]:[0,-.035,.035]){
      const candidateYaw=yaw+offset;
      const cy=Math.cos(candidateYaw),sy=Math.sin(candidateYaw);
      const rotate=(x:number,y:number,z:number):[number,number,number]=>{
        const ux=cr*x*scale-sr*y;
        return [cy*ux+sy*z,sr*x*scale+cr*y,-sy*ux+cy*z];
      };
      const stock=rotate(data.stockX,0,0);
      const right=rotate(data.primaryX-data.stockX,data.primaryY,1.8);
      const left=rotate(data.supportX-data.stockX,data.supportY,-1.6);
      for(const dx of [0,.7,-.7,1.4,-1.4])
        for(const dz of [0,.4,-.4,.8,-.8]){
          // Select stable anatomy first. Applying clearance during fit
          // lets the optimizer move dx forward and cancel the retraction.
          const sx=contactPocket.x+dx-recoilX;
          const sy=contactPocket.y+recoilY;
          const sz=contactPocket.z+dz;
          // Ordinary firing stays against the front torso. Short-stock
          // deliberately travels OUTSIDE its side to a separate underarm
          // pocket, so the butt doesn't clip through a vest or ribs.
          if(sz<(mode==='short'?7.6:stockless?4.10:4.55))continue;
          const px=sx+right[0],py=sy+right[1],pz=sz+right[2];
          const lx=sx+left[0],ly=sy+left[1],lz=sz+left[2];
          const rd=Math.hypot(px-1,py-4,pz-7);
          const ld=Math.hypot(lx-1,ly-4,lz+7);
          const violation=Math.max(0,rd-LIMIT)+Math.max(0,ld-LIMIT);
          const contact=Math.hypot(dx,dz);
          // Do not bury the buttstock to improve IK reach. A small reported
          // hand reach error is preferable to crossing the torso mesh.
          const cost=violation*13+contact*3+
            Math.abs(offset)*2+Math.abs(dx)*.25;
          if(cost>=bestScore)continue;
          bestScore=cost;
          best={sx,sy,sz,mode,yaw:candidateYaw,roll:physicalRoll,
            stock,primary:right,support:left,twoHanded:
              rd<=LIMIT&&ld<=LIMIT,primaryReachable:rd<=LIMIT,
            contactError:violation};
        }
    }
  }
  const b=best!;
  // Legacy explicit clearance (manual callers only). Live approach uses
  // the progressive shortCompression path above, without a sudden slide.
  // Apply a single rigid slide to stock and both contact sockets.
  const retract=input.handling==='short'?
    clamp(input.clearanceRetraction??0,0,3.4):0;
  const stock=new THREE.Vector3(b.sx-retract,b.sy,b.sz);
  const primary=new THREE.Vector3(
    b.sx+b.primary[0]-retract,b.sy+b.primary[1],b.sz+b.primary[2]);
  const support=new THREE.Vector3(
    b.sx+b.support[0]-retract,b.sy+b.support[1],b.sz+b.support[2]);
  const origin=stock.clone().sub(
    new THREE.Vector3(...b.stock));
  // Absolute stock shoulder error includes recoil impulse, but no
  // independent hand or stock teleportation occurs.
  // Compare the physical buttstock against a stable operator anatomy point,
  // not a reference synthesized from the stock itself (always zero).
  const pocket=input.aimBlend===undefined||input.handling==='short'||
    input.handling==='low'?
    lowReadyPocket(stockPocket(input.handling,input.armorPush),relaxed,relaxedWeight):{
      x:stockPocket('ready',input.armorPush).x+
        (stockPocket('ads',input.armorPush).x-stockPocket('ready',input.armorPush).x)*
        clamp(input.aimBlend,0,1),
      y:stockPocket('ready',input.armorPush).y+
        (stockPocket('ads',input.armorPush).y-stockPocket('ready',input.armorPush).y)*
        clamp(input.aimBlend,0,1),
      z:stockPocket(input.handling,input.armorPush).z
    };
  const rightGap=Math.max(0,primary.distanceTo(new THREE.Vector3(1,4,7))-LIMIT);
  const leftGap=Math.max(0,support.distanceTo(new THREE.Vector3(1,4,-7))-LIMIT);
  return {origin,rotation:new THREE.Euler(0,b.yaw,b.roll,'XYZ'),
    stock,primary,support,twoHanded:rightGap===0&&leftGap===0,
    primaryReachable:rightGap===0,handling:b.mode,
    contactError:rightGap+leftGap,stockError:stockless?0:anchorGap(stock,pocket)};
}
/** The support-hand rest/guard target for an impossible two-handed fit. */
export function supportGuardTarget(weapon:THREE.Vector3):THREE.Vector3{
  const target=weapon.clone();target.x=clamp(target.x,7,13);
  target.y=clamp(target.y,0,6);
  target.z=clamp(target.z,-5,-1);
  return target;
}
