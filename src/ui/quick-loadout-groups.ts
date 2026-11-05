/** Purpose-first Quick Play equipment grouping.
 * Selection and compatibility remain owned by breach-roster/equipment-catalog.
 * No loadout state or gameplay behavior lives in this UI helper.
 */
import type {EquipmentSlot} from '../equipment-catalog.ts';
export type QuickLoadoutGroup='weapon'|'protection'|'carry'|'utilities'|'issued';
export const QUICK_LOADOUT_GROUPS=[
 {id:'weapon',title:'WEAPON',hint:'PRIMARY & ATTACHMENTS'},
 {id:'protection',title:'PROTECTION',hint:'HELMET & ARMOR'},
 {id:'carry',title:'CARRY',hint:'RIG, BELT, PACK & MAGAZINES'},
 {id:'utilities',title:'UTILITIES',hint:'MEDICAL, TACTICAL & TOOLS'},
 {id:'issued',title:'ISSUED BASICS',hint:'FUNCTIONAL CLOTHING SLOTS · APPEARANCE IN STUDIO'}
] as const;
export function loadoutGroupForSlot(slot:EquipmentSlot):QuickLoadoutGroup{
 switch(slot){
  case 'primary':case 'secondary':return 'weapon';
  case 'head':case 'armor':return 'protection';
  case 'rig':case 'belt':case 'backpack':return 'carry';
  case 'medical':case 'tactical':case 'utility':return 'utilities';
  case 'top':case 'legs':case 'hands':case 'feet':return 'issued';
 }
}
export function buildQuickLoadoutGroups(root:HTMLElement,selected:QuickLoadoutGroup,
 onSelect:(group:QuickLoadoutGroup)=>void){
 const groups={} as Record<QuickLoadoutGroup,HTMLDetailsElement>;
 const all:HTMLDetailsElement[]=[];
 for(const definition of QUICK_LOADOUT_GROUPS){
  const details=document.createElement('details');
  details.className='fw-loadout-group';
  details.dataset.loadoutGroup=definition.id;
  details.open=definition.id===selected;
  const summary=document.createElement('summary');
  const label=document.createElement('strong');label.textContent=definition.title;
  const note=document.createElement('small');note.textContent=definition.hint;
  summary.append(label,note);details.append(summary);
  const body=document.createElement('div');body.className='fw-loadout-fields';
  details.append(body);root.append(details);
  groups[definition.id]=details;all.push(details);
  details.addEventListener('toggle',()=>{
   if(details.open){
    onSelect(definition.id);
    for(const other of all)if(other!==details&&other.open)other.open=false;
   }
  });
 }
 return {
  group:groups,
  field:(id:QuickLoadoutGroup)=>
    groups[id].querySelector<HTMLElement>('.fw-loadout-fields')!,
 };
}
