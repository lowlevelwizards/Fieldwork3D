/** BT4.4–5: pure deterministic placement manifest. The resolver is a
 * transaction candidate, never an inventory issuer. Existing V1 location
 * fields are projections to migrate after all consumers are ready. */
import {ATTACHMENTS,attachmentFootprint,type AttachmentId,type AttachmentVariant} from './operator-attachment-catalog.ts';
import type {BeltStyle} from './operator-belt-profile.ts';
import {fixedWaistCandidates,fixedWaistSlots,waistPlacementsConflict,dimensionsFit,
 type Carrier,type CarryKind,type Dimensions,type StorageSlot,type WaistPlacement} from './equipment-fixed-carrier-slots.ts';
export type CarryItem={id:string;kind:CarryKind;dimensions:Dimensions;
 /** Optional larger internal capacity claim, e.g. trauma or long tool. */
 units?:number;holder?:AttachmentId;variant?:AttachmentVariant;optional?:boolean};
export type CarryInput={belt:BeltStyle;holsterSide?:'left'|'right';historicalWaist?:boolean;
 storage:readonly StorageSlot[];items:readonly CarryItem[]};
export type Placement={itemIds:string[];carrier:Carrier;slotIds:string[];holder?:AttachmentId;
 variant?:AttachmentVariant;waist?:WaistPlacement;concealed:boolean};
export type PlacementManifest={placements:Placement[];unplaced:{id:string;reason:'no-fit'|'duplicate'|'invalid-item'}[];
 valid:boolean;searchTruncated:boolean};
export const CARRY_PRIORITY:Readonly<Record<CarryKind,readonly Carrier[]>>={
 sidearm:['belt'], 'primary-mag':['rig','armor','belt','pocket','backpack'],
 'secondary-mag':['belt','rig','armor','pocket','backpack'], shell:['rig','belt','pocket','backpack'],
 flash:['belt','rig','armor','backpack'],wedge:['belt','rig','pocket','backpack'],
 medical:['belt','rig','armor','backpack','pocket'],trauma:['backpack','rig','armor','belt'],
 radio:['rig','armor','belt','backpack'],light:['belt','rig','pocket','backpack'],
 tool:['backpack'],misc:['belt','rig','armor','pocket','backpack'],dump:['belt','rig'],cosmetic:['belt','rig','armor','backpack']
};
const HOLDER:Partial<Record<CarryKind,AttachmentId>>={sidearm:'rigid-holster','primary-mag':'primary-mag-pouch',
 'secondary-mag':'pistol-mag-pouch',shell:'shell-holder',flash:'grenade-pouch',wedge:'wedge-holder',
 medical:'medical-pouch',radio:'radio-holder',light:'flashlight-holder',misc:'utility-pouch',dump:'dump-pouch'};
const rank:Record<CarryKind,number>={sidearm:0,tool:1,trauma:2,medical:3,'primary-mag':5,'secondary-mag':4,
 shell:5,flash:4,wedge:4,radio:4,light:4,misc:6,dump:7,cosmetic:8};
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
const hipOrder=(side:'left'|'right')=>side==='right'?['left-hip','right-hip']:['right-hip','left-hip'];
const preferred=(kind:CarryKind,side:'left'|'right')=>{
 if(kind==='sidearm')return [side+'-hip'];
 if(kind==='dump'||kind==='medical'||kind==='misc')return ['rear','rear-left','rear-right',...hipOrder(side),'front-left','front-right'];
 if(kind==='primary-mag'||kind==='secondary-mag'||kind==='shell')return [...hipOrder(side),'front-left','front-right','rear-left','rear-right','rear'];
 return ['front-left','front-right','rear-left','rear-right',...hipOrder(side),'rear'];
};
type Candidate=Placement&{order:number};
type Job={item:CarryItem;options:Candidate[]};
function holderFits(item:CarryItem,holder:AttachmentId,variant:AttachmentVariant){
 const f=attachmentFootprint(holder,variant);
 // Contents use the holder aperture, not its exterior footprint. Sidearm
 // and shell art can protrude by design; their actual fit needs adapter data.
 if(item.kind==='dump'||item.kind==='cosmetic')return true;
 const open=['primary-mag-pouch','pistol-mag-pouch','grenade-pouch','radio-holder','flashlight-holder','wedge-holder'].includes(holder);
 const wall=open?.88:.45;
 return dimensionsFit(item.dimensions,{width:f.width-wall,height:f.height+(open?1.1:0),depth:f.depth-wall});
}
function itemCandidates(input:CarryInput,item:CarryItem,slots:ReturnType<typeof fixedWaistSlots>):Candidate[]{
 const out:Candidate[]=[],side=input.holsterSide??'right';
 let order=0;
 for(const carrier of CARRY_PRIORITY[item.kind]){
  if(carrier==='belt'){
   const holder=item.holder??HOLDER[item.kind];if(!holder)continue;
   const definition=ATTACHMENTS[holder];
   if(!definition.beltStyles.includes(input.belt)||!definition.carriers.includes('belt'))continue;
   const variants=item.variant?[item.variant]:holder==='primary-mag-pouch'?['standard','expanded'] as const:['standard'] as const;
   const preference=preferred(item.kind,side);
   for(const variant of variants){
    if(!definition.variants.includes(variant)||!holderFits(item,holder,variant))continue;
    const allowed=item.kind==='sidearm'?definition.regions.filter(r=>r===side+'-hip'):definition.regions;
    const fits=fixedWaistCandidates(input.belt,slots,attachmentFootprint(holder,variant),allowed)
     .sort((a,b)=>preference.indexOf(a.region)-preference.indexOf(b.region)||a.ids.length-b.ids.length);
    for(const waist of fits)out.push({itemIds:[item.id],carrier,slotIds:waist.ids,holder,variant,waist,concealed:false,order:order++});
   }
  }else{
   const candidates=input.storage.filter(s=>s.carrier===carrier&&s.accepts.includes(item.kind)&&dimensionsFit(item.dimensions,s.dimensions))
    .sort((a,b)=>Number(!!b.dedicated)-Number(!!a.dedicated)||cmp(a.id,b.id));
   const units=item.units??1;
   for(let i=0;i<candidates.length;i++){
    const first=candidates[i];
    // Multi-unit items only in genuinely contiguous numbered internal
    // storage cells, not unrelated pockets or dedicated magazine lanes.
    const run=candidates.slice(i,i+units);
    if(run.length!==units)continue;
    if(units>1&&(carrier!=='backpack'||run.some((s,j)=>s.id!=='pack:'+(Number(first.id.slice(5))+j))))continue;
    const keys=run.flatMap(s=>[s.id,...s.conflicts??[]]);
    if(new Set(keys).size!==keys.length)continue;
    out.push({itemIds:[item.id],carrier,slotIds:keys,concealed:first.concealed,order:order++});
   }
  }
 }
 return out;
}
function conflicts(a:Placement,b:Placement){
 return a.slotIds.some(id=>b.slotIds.includes(id))||!!(a.waist&&b.waist&&waistPlacementsConflict(a.waist,b.waist));
}
/** Fixed priority tiers and stable IDs; bounded deterministic search only
 * when a straightforward arrangement fails. Never mutate input, never
 * silently discard a mandatory item. Earlier priority items win ties. */
export function resolveUnifiedCarry(input:CarryInput,maxNodes=12000):PlacementManifest{
 const slots=fixedWaistSlots(input.belt,input.holsterSide,input.historicalWaist);
 const counts=new Map<string,number>();for(const item of input.items)counts.set(item.id,(counts.get(item.id)??0)+1);
 const invalid:PlacementManifest['unplaced']=[],jobs:Job[]=[];
 const uniqueStorage=new Set(input.storage.map(s=>s.id));
 if(uniqueStorage.size!==input.storage.length)throw Error('Duplicate carrier slot identity');
 for(const item of input.items){
  if(counts.get(item.id)!>1){if(!invalid.some(p=>p.id===item.id))invalid.push({id:item.id,reason:'duplicate'});continue;}
  if(!item.id||!dimensionsFit(item.dimensions,item.dimensions)||!Number.isInteger(item.units??1)||(item.units??1)<1){
   invalid.push({id:item.id,reason:'invalid-item'});continue;
  }
  jobs.push({item,options:itemCandidates(input,item,slots)});
 }
 jobs.sort((a,b)=>Number(!!a.item.optional)-Number(!!b.item.optional)||
  rank[a.item.kind]-rank[b.item.kind]||a.options.length-b.options.length||cmp(a.item.id,b.item.id));
 // Reserve dedicated primary cells before other equipment competes for
 // flexible storage. Options still follow the individual carrier flow.
 const best:Candidate[]=[];let bestScore=-1,bestMask='',nodes=0,truncated=false;
 const mandatory=jobs.filter(j=>!j.item.optional).length;
 const selected:Candidate[]=[];
 const visit=(i:number,score:number,mask:string)=>{
  if(++nodes>maxNodes){truncated=true;return;}
  if(i===jobs.length){
   if(score>bestScore||(score===bestScore&&mask>bestMask)){
    bestScore=score;bestMask=mask;best.splice(0,best.length,...selected);
   }return;
  }
  if(bestScore===mandatory*(jobs.length+1)+(jobs.length-mandatory))return;
  const j=jobs[i],weight=j.item.optional?1:jobs.length+1;
  for(const option of j.options){
   if(selected.some(p=>conflicts(p,option)))continue;
   selected.push(option);visit(i+1,score+weight,mask+'1');selected.pop();
   if(truncated||bestScore===mandatory*(jobs.length+1)+(jobs.length-mandatory))return;
  }
  visit(i+1,score,mask+'0');
 };
 // Seed with a complete greedy result so the bounded search always has a
 // usable diagnostic, even when many reserve magazines exhaust the search.
 let mask='',score=0;
 for(const job of jobs){
  const option=job.options.find(o=>!best.some(p=>conflicts(p,o)));
  if(option){best.push(option);mask+='1';score+=job.item.optional?1:jobs.length+1;}else mask+='0';
 }
 bestScore=score;bestMask=mask;
 if(best.length<jobs.length)visit(0,0,'');
 const placements=best.map(({order:_,...p})=>p);
 const placed=new Set(placements.flatMap(p=>p.itemIds));
 const unplaced=[...invalid,...jobs.filter(j=>!placed.has(j.item.id)).map(j=>({id:j.item.id,reason:'no-fit' as const}))].sort((a,b)=>cmp(a.id,b.id));
 return {placements,unplaced,valid:!invalid.length&&!jobs.some(j=>!j.item.optional&&!placed.has(j.item.id)),searchTruncated:truncated};
}
/** Deployment keeps holders stable; consumption clears only the item cell.
 * Empty reservations remain occupied until an explicit refit. */
export function removeManifestContent(manifest:PlacementManifest,id:string):PlacementManifest{
 return {...manifest,placements:manifest.placements.map(p=>p.itemIds.includes(id)?{...p,itemIds:p.itemIds.filter(i=>i!==id)}:p)};
}
