/** BP10: appearance-only attachment policy. No item or protection changes.
 * Optional modular variants are explicit choices, not assumptions about every pack.
 */
export type PackMountMode='auto'|'independent'|'direct'|'shared'|'adapter';
export const PACK_MOUNT_MODES=['auto','independent','direct','shared','adapter'] as const;
export const SHARED_RIGS=new Set(['micro-rig','chest-placard','split-front','full-chest']);
export const DIRECT_PACKS=new Set(['hydration','assault-panel','day-pack','assault-pack','medic-pack','comms-pack']);
export const ADAPTER_PACKS=new Set(['day-pack','assault-pack','medic-pack','comms-pack']);
export function rearCarrierMount(armor:string){return armor==='plate-jpc'||armor==='plate-standard';}
export function frontCarrierMount(armor:string,rig:string){
 return ['plate-jpc','plate-standard','plate-heavy'].includes(armor)&&['micro-rig','chest-placard'].includes(rig);
}
const canonical=(style:string)=>style==='admin-pack'?'assault-panel':style;
export function packMountChoices(style:string,armor:string,rig:string):PackMountMode[]{
 style=canonical(style);
 if(style==='assault-panel')return rearCarrierMount(armor)?['direct']:[];
 const result:PackMountMode[]=['independent'];
 if(rearCarrierMount(armor)&&DIRECT_PACKS.has(style))result.push('direct');
 if(SHARED_RIGS.has(rig)&&DIRECT_PACKS.has(style)&&!frontCarrierMount(armor,rig))result.push('shared');
 if(rearCarrierMount(armor)&&ADAPTER_PACKS.has(style))result.push('adapter');
 return result;
}
export function equipmentAssembly(style:string,armor:string,rig:string,requested:PackMountMode='auto'){
 style=canonical(style);
 const choices=packMountChoices(style,armor,rig);
 const mode=requested!=='auto'&&choices.includes(requested)?requested:
  style==='assault-panel'?'direct':
  style==='hydration'&&choices.includes('direct')?'direct':
  choices.includes('shared')?'shared':'independent';
 const externalRig=rig!=='no-rig'&&!frontCarrierMount(armor,rig)&&mode!=='shared';
 return {mode,compatible:choices.includes(mode),externalRig,sharedRig:mode==='shared',direct:mode==='direct',adapter:mode==='adapter'};
}
