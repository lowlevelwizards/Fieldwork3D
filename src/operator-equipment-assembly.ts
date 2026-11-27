/** BP10: appearance-only attachment policy. No item or protection changes.
 * Optional modular variants are explicit choices, not assumptions about every pack.
 */
export type PackMountMode='auto'|'independent'|'direct'|'shared'|'adapter';
export const PACK_MOUNT_MODES=['auto','independent','direct','shared','adapter'] as const;
export const SHARED_RIGS=new Set(['micro-rig','chest-placard','split-front','full-chest']);
export const DIRECT_PACKS=new Set(['hydration','assault-panel','day-pack','assault-pack','medic-pack','comms-pack']);
export function rearCarrierMount(armor:string){return armor==='plate-jpc'||armor==='plate-standard';}
export function frontCarrierMount(armor:string,rig:string){
 return ['plate-jpc','plate-standard','plate-heavy'].includes(armor)&&['micro-rig','chest-placard'].includes(rig);
}
const canonical=(style:string)=>style==='admin-pack'?'assault-panel':style;
/** One deterministic mount per outfit. Legacy requested modes are ignored.
 * Direct rear mounting takes precedence over shared front suspension. */
export function equipmentAssembly(style:string,armor:string,rig:string,_requested:PackMountMode='auto'){
 style=canonical(style);
 const compatible=style!=='assault-panel'||rearCarrierMount(armor);
 const direct=compatible&&rearCarrierMount(armor)&&DIRECT_PACKS.has(style);
 const sharedRig=compatible&&!direct&&SHARED_RIGS.has(rig)&&DIRECT_PACKS.has(style)&&!frontCarrierMount(armor,rig);
 const mode:PackMountMode=direct?'direct':sharedRig?'shared':'independent';
 return {mode,compatible,externalRig:rig!=='no-rig'&&!frontCarrierMount(armor,rig)&&!sharedRig,sharedRig,direct,adapter:false};
}
export function packMountChoices(style:string,armor:string,rig:string):PackMountMode[]{
 const a=equipmentAssembly(style,armor,rig);return a.compatible?[a.mode]:[];
}

/** Shared suspension joins are defined once in chest space; the rig
 * builder subtracts its group translation to reach the identical socket. */
export function sharedRigClips(frame:{front:{x:number};shoulderRight:{z:number}},sign:-1|1){
 const z=sign*Math.min(5.6,Math.max(3.5,frame.shoulderRight.z)+.35);
 return {upper:[frame.front.x+.28,2.2,z] as const,lower:[frame.front.x+.1,-3.2,sign*5.6] as const};
}
