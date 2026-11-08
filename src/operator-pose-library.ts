/** Human-authored reference poses and non-destructive cross-weapon pose transfer.
 * All generated applications are DRAFTS in Operator Lab, never game defaults.
 * Their hand targets adapt to each real weapon's grips, while body/arm
 * presentation stays controlled by the author. References remain unmodified.
 */
import * as THREE from 'three';
import {FAMILY_PRESETS,familyPreset} from './equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {cloneWorkbenchPose,weaponWorkbenchContacts,readWorkbenchPose,
 type WorkbenchPose,type Vec3} from './operator-pose-workbench.ts';
import type {WeaponId} from './breach-combat.ts';
export type PoseQuality='reference'|'generated'|'tuned';
export type PoseEntry={pose:WorkbenchPose;quality:PoseQuality;from?:string};
export type PoseLibrary={version:2;kind:'fieldwork-pose-library';
 name:string;entries:Record<string,PoseEntry>};
export const PRESET_CATALOG=[
 ...FAMILY_PRESETS.map(p=>({id:p.id,name:p.name,weapon:p.weapon,
  family:p.family})),
 {id:'shotgun',name:'Classic Shotgun',weapon:'shotgun' as const,
  family:'shotgun' as const}
];
export const PRESET_IDS=new Set(PRESET_CATALOG.map(p=>p.id));
const m4:WorkbenchPose={
 version:1,weapon:'carbine',preset:'ar-m4a1',
 targets:{
  stock:[-9.2,-3.1,9.5],
  supportShoulder:[4.1,4.8,-5.8],
  firingShoulder:[3.6,3.94,5.3],
  supportHand:[9.65443922690596,-8.220156243484727,4.960267438360026],
  firingHand:[-1.5429852109064708,-8.962764956152528,9.93532957459017],
  supportElbow:[9.5,-3.1,-0.6],
  firingElbow:[-3.8,-4.050550665342721,12.08454391675615]
 },
 torso:[0,0.8021409131831525,-0.7091446901966934],
 weaponRotation:[3,8,-13]
};
const akm:WorkbenchPose={
 version:1,weapon:'rifle',preset:'ak-akm',
 targets:{
  stock:[-6.3,-3.8,8.8],
  supportShoulder:[4.8,3.6,-6.5],
  firingShoulder:[1.120000000000001,3.94,6.899999999999999],
  supportHand:[13.778785492332526,-10.614421882537883,6.303289452161966],
  firingHand:[0.4996208344622355,-10.33299085695294,9.383907501678461],
  supportElbow:[11.3,-6,-3.690078005608802],
  firingElbow:[-6.8,-3.9832426172006907,12.294615103017726]
 },
 torso:[0,0.8021409131831525,-0.7091446901966934],
 weaponRotation:[13,-2,-16]
};
/** Store the exact exported decimals, not quantized XYZ sliders. */
export const AUTHORED_SHORT_REFERENCES:Readonly<Record<string,WorkbenchPose>>={
 'ar-m4a1':m4,'ak-akm':akm
};
export function specForPreset(id:string):{
 weapon:WeaponId;configuration?:WeaponConfiguration
}{
 if(id==='shotgun')return {weapon:'shotgun'};
 const preset=familyPreset(id);
 if(!preset)throw Error('Unknown weapon preset '+id);
 return {weapon:preset.weapon,configuration:
  selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id)};
}
export function newPoseLibrary():PoseLibrary{
 return {version:2,kind:'fieldwork-pose-library',name:'Short stock',
  entries:Object.fromEntries(Object.entries(AUTHORED_SHORT_REFERENCES)
   .map(([id,pose])=>[id,{pose:cloneWorkbenchPose(pose),
    quality:'reference' as const}]))};
}
const axis=(v:Vec3)=>new THREE.Vector3(...v);
const xyz=(v:THREE.Vector3):Vec3=>[v.x,v.y,v.z];
const clamp=(n:number,limit:number)=>Math.max(-limit,Math.min(limit,n));
/** Source is the saved or authored pose, not the stock/grip recipe from an
 * unreviewed family. Transfer retains the user's authored wrist-vs-gun
 * offset, while adjusting actual grips for a new weapon length/receiver.
 * The firing wrist remains steady where possible by shifting the stock;
 * the support wrist follows its target handguard with a bounded residual.
 * Human shoulders and elbow poles are transferred, then guide positions
 * respond to wrist travel. No fabricated bone scaling or automatic approval.
 */
export function transferPoseToWeapon(source:WorkbenchPose,
 targetPreset:string,sourceConfig?:WeaponConfiguration):WorkbenchPose{
 if(!PRESET_IDS.has(targetPreset))throw Error('Unknown target '+targetPreset);
 const target=specForPreset(targetPreset);
 if(source.preset===targetPreset&&source.weapon===target.weapon)
  return cloneWorkbenchPose(source);
 const fromConfig=sourceConfig??specForPreset(source.preset).configuration;
 const from=weaponWorkbenchContacts(source,fromConfig);
 const next=cloneWorkbenchPose(source);
 next.preset=targetPreset;next.weapon=target.weapon;
 const recipient=weaponWorkbenchContacts(next,target.configuration);
 // Move buttplate so the pistol grip reaches the same stable firing hand.
 // Cap only the adjustment, not the exact author-supplied reference.
 const seatShift=from.firing.clone().sub(recipient.firing);
 seatShift.set(clamp(seatShift.x,7),clamp(seatShift.y,5),
  clamp(seatShift.z,5));
 next.targets.stock=xyz(axis(next.targets.stock).add(seatShift));
 const shifted=weaponWorkbenchContacts(next,target.configuration);
 const adjust=(side:'support'|'firing')=>{
  const key=side==='support'?'supportHand':'firingHand';
  const elbowKey=side==='support'?'supportElbow':'firingElbow';
  const srcGrip=from[side];
  const destGrip=shifted[side];
  const originalHand=axis(source.targets[key]);
  const gripResidual=originalHand.clone().sub(srcGrip);
  // Respect intentional user offsets; make conservative default attempts.
  if(gripResidual.length()>3)gripResidual.setLength(3);
  const wanted=destGrip.add(gripResidual);
  next.targets[key]=xyz(wanted);
  const wristTravel=wanted.sub(originalHand);
  next.targets[elbowKey]=xyz(axis(source.targets[elbowKey])
    .addScaledVector(wristTravel,.46));
 };
 adjust('firing');adjust('support');
 return next;
}
/** Nearest human reference: AK for AK/rifle and shotgun, M4 for AR/SMG.
 * This is a heuristic only; the quality remains "generated" until edited.
 */
export function referenceForPreset(id:string):WorkbenchPose{
 const preset=PRESET_CATALOG.find(p=>p.id===id);
 if(!preset)throw Error('Unknown target '+id);
 const idSource=preset.family==='ak'||preset.weapon==='shotgun'||
   preset.family==='hk'&&preset.weapon==='rifle'?
   'ak-akm':'ar-m4a1';
 return AUTHORED_SHORT_REFERENCES[idSource];
}
export function applyToAllWeapons(library:PoseLibrary,
 from:WorkbenchPose|'references',replaceGenerated=false):{
 created:number;skipped:number
}{
 let created=0,skipped=0;
 for(const preset of PRESET_CATALOG){
  const existing=library.entries[preset.id];
  // Never overwrite a sculpted exception or one of the true references.
  if(existing&&
   (existing.quality!=='generated'||!replaceGenerated)){
   skipped++;continue;
  }
  const anchor=from==='references'?referenceForPreset(preset.id):from;
  const transferred=transferPoseToWeapon(anchor,preset.id);
  library.entries[preset.id]={
   pose:transferred,quality:
    preset.id===anchor.preset&&from==='references'?'reference':'generated',
   from:anchor.preset
  };
  created++;
 }
 return {created,skipped};
}
export function parsePoseLibrary(raw:string):PoseLibrary{
 if(raw.length>300000)throw Error('Pose library is too large');
 const obj:unknown=JSON.parse(raw);
 if(!obj||typeof obj!=='object')throw Error('Expected a pose library');
 const data=obj as Record<string,unknown>;
 if(data.version!==2||data.kind!=='fieldwork-pose-library'||
  !data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))
  throw Error('Invalid pose library format');
 const result=newPoseLibrary();
 result.name=typeof data.name==='string'?data.name.slice(0,80):
  'Short stock';
 const rows=data.entries as Record<string,unknown>;
 if(Object.keys(rows).length>PRESET_CATALOG.length)
  throw Error('Too many pose entries');
 for(const [id,entry] of Object.entries(rows)){
  if(!PRESET_IDS.has(id)||!entry||typeof entry!=='object')
   throw Error('Unknown pose entry '+id);
  const e=entry as Record<string,unknown>;
  const pose=readWorkbenchPose(JSON.stringify(e.pose));
  if(pose.preset!==id||specForPreset(id).weapon!==pose.weapon)
   throw Error('Preset / weapon mismatch '+id);
  if(!['reference','generated','tuned'].includes(String(e.quality)))
   throw Error('Invalid quality for '+id);
  result.entries[id]={
   pose,quality:e.quality as PoseQuality,
   ...(typeof e.from==='string'?{from:e.from.slice(0,80)}:{})
  };
 }
 return result;
}
