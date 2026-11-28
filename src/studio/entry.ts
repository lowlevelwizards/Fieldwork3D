/** Opt-in standalone Studio integration. Edits affect only a disposable roster. */
import {initialRoster,equipRosterGear,equipRosterCarryGear,equipRosterCatalogPreset} from '../breach-roster.ts';
import {catalogOutfitterSources,catalogOutfitterThumbnailTarget} from '../ui/outfitter-choice-sources.ts';
import {quoteQuickPlayArsenalEdit,applyQuickPlayArsenalEdit} from '../arsenal/quickplay-adapter.ts';
import {createStudioOperatorEquipment} from './operator-equipment.ts';
import {createStudioArsenal} from './arsenal.ts';
import {mountStudioShell} from './shell.ts';
import type {StudioEntry} from './navigation.ts';

const root=document.getElementById('studioRoot');
if(!root)throw new Error('Missing Studio root');
let roster=initialRoster();
const params=new URLSearchParams(location.search);
const operator=roster.members.find(m=>m.id===params.get('operator'))??roster.members[0];
if(!operator)throw new Error('No Studio operator available');
const entry:StudioEntry=params.get('workspace')==='arsenal'?
 {workspace:'arsenal',slot:params.get('slot')==='primary'?'primary':params.get('slot')==='secondary'?'secondary':null}:
 {workspace:'operators',category:params.get('category')};
let dirty=false;
const equipment=createStudioOperatorEquipment({
 listOperators:()=>roster.members,
 readOperator:id=>{
  const member=roster.members.find(m=>m.id===id);
  if(!member)return null;
  return {member,sources:catalogOutfitterSources(member.loadout,member.weaponConfiguration),locked:false,
   thumbnailTarget:(slot,itemId)=>catalogOutfitterThumbnailTarget(member.loadout,member.weaponConfiguration,slot,itemId)};
 },
 equip:(id,slot,itemId)=>{
  const next=slot==='primary'?equipRosterCatalogPreset(roster,id,itemId):
   slot==='rig'||slot==='belt'||slot==='backpack'?equipRosterCarryGear(roster,id,slot,itemId,'unified'):
   equipRosterGear(roster,id,slot,itemId,'unified');
  if(next===roster)return false;
  roster=next;dirty=true;return true;
 }
});
const arsenal=createStudioArsenal({
 primaryContext:route=>{
  const id=route.operatorId;
  if(route.slot!=='primary'||!id||!roster.members.some(m=>m.id===id))return undefined;
  return {mode:'quick',applyLabel:'APPLY TO STUDIO OPERATOR',
   quote:recipe=>{const q=quoteQuickPlayArsenalEdit(roster,id,recipe);return {...q,canCommit:q.valid};},
   onApply:recipe=>{
    const q=quoteQuickPlayArsenalEdit(roster,id,recipe);
    if(!q.valid)return {ok:false,message:q.reason};
    const next=applyQuickPlayArsenalEdit(roster,id,recipe);
    if(next!==roster){roster=next;dirty=true;}
    return {ok:true};
   }};
 },
 onError:()=>{const status=document.getElementById('studioStatus');if(status)status.textContent='Weapon editor unavailable. Return to the gallery and try again.';}
});
const shell=mountStudioShell(root,{
 context:{mode:'standalone',operatorId:operator.id,returnTo:'menu'},entry,
 workspaces:{operators:equipment,arsenal},
 canLeave:(_from,to)=>to!==null||!dirty||window.confirm('Discard this temporary Studio roster? Saved weapon builds are kept.'),
 onClose:()=>{dirty=false;location.href='./index.html';},
 onError:()=>{const status=document.getElementById('studioStatus');if(status)status.textContent='Studio workspace unavailable.';}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',event=>{if(!event.persisted)shell.dispose();});
