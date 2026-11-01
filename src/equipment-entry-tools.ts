/** Build 23.01: single equip-slot tool capability, shared by Armory and mission.
 * Utility items do not grant invisible tools when not equipped.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {EntryTool} from './breach-entry-tools.ts';
export const ENTRY_TOOL_EQUIPMENT:Readonly<Record<string,EntryTool[]>>={
 'utility-breach':['breach'],
 'utility-pry':['pry'],
 'utility-cutter':['cut'],
 'utility-wedge':['wedge','unwedge']
};
export function equippedEntryMethods(kit?:EquipmentLoadout):readonly EntryTool[]{
 return ENTRY_TOOL_EQUIPMENT[kit?.slots.utility??'']??[];
}
/** A wedge carrier starts with two physical wedges per issued kit. */
export const issuedWedges=(kit?:EquipmentLoadout)=>
 kit?.slots.utility==='utility-wedge'?2:0;
export const canUseEntryTool=(kit:EquipmentLoadout|undefined,tool:EntryTool):boolean=>
 equippedEntryMethods(kit).includes(tool);
