import {authoredRigStorageCells} from './operator-rig-pouch-layout.ts';
/** BT4: adapt existing authoritative owned inventory into a read-only fit
 * quote. It does not stage, create, spend, or rewrite any legacy item.
 * Authored rig cells are supplied by the actual carrier, not a guessed count. */
import type {MagazineLocation} from './equipment-magazine-placement.ts';
import type {FieldCarryLocation,FieldInventory} from './equipment-field-inventory.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {initialFieldInventory,fieldQuantity,FIELD_ITEMS,FIELD_ITEM_IDS} from './equipment-field-inventory.ts';
import {resolvedWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import {beltStyleForEquipment} from './operator-belt-profile.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {LEG_HIP_HEIGHT} from './breach-leg-geometry.ts';
import {armorAttachmentFrame} from './operator-armor-attachment-frame.ts';
import {fitPack,supportsDirectPack} from './operator-backpack-fit.ts';
import {proposedPackStyle,PACK_PROFILES} from './operator-backpack-catalog.ts';
import {nativeEquippedMagazine,nativeSecondaryMagazineSize} from './operator-attachment-reference.ts';
import type {MagazinePouchCell} from './operator-magazine-pouch-fit.ts';
import {attachmentFootprint,type AttachmentId} from './operator-attachment-catalog.ts';
import {clothingStorage,packStorage,registeredRigStorage,registeredAuxiliaryStorage,modularArmorStorage,
 type CarryKind,type Dimensions,type CarryVolume} from './equipment-fixed-carrier-slots.ts';
import {resolveUnifiedCarry,auditInitialUnifiedManifest,type CarryItem,type CarryInput} from './equipment-unified-placement.ts';
export type UnifiedLoadoutSource={kit:EquipmentLoadout;wardrobe?:WardrobeOptions;magazines:readonly MagazineItem[];
 primaryPart?:string|null;rigCells?:readonly MagazinePouchCell[];auxiliaryCells?:readonly MagazinePouchCell[];
 shellReserve?:number;secondaryMagazineSize?:Dimensions};
const dim=(width:number,height:number,depth:number):Dimensions=>({width,height,depth});
const nativeCache=new Map<string,Dimensions|null>();
export function nativeMagazineDimensions(part:string):Dimensions|null{
 if(nativeCache.has(part))return nativeCache.get(part)!;
 const g=nativeEquippedMagazine(part);
 let result:Dimensions|null=null;
 if(g){const b=g.boundingBox!;result=dim(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z);g.dispose();}
 nativeCache.set(part,result);return result;
}
const defaultPart=(primary:string)=>primary==='primary-smg'?'hk9-mag30':primary==='primary-rifle'?'fal-mag20':'ar-mag30';
const utility:Readonly<Record<string,{kind:CarryKind;size:Dimensions;units?:number}>>={
 'utility-radio':{kind:'radio',size:dim(2.0,4.4,1.55)},
 'utility-light':{kind:'light',size:dim(1.25,6.2,1.25)},
 'utility-breach':{kind:'tool',size:dim(3.2,10,3.2),units:3},
 'utility-pry':{kind:'tool',size:dim(2.6,10,1.5),units:2},
 'utility-cutter':{kind:'tool',size:dim(4.5,9,2.2),units:2}
};
const fieldKind:Partial<Record<(typeof FIELD_ITEM_IDS)[number],{kind:CarryKind;size:Dimensions}>>={
 flashbang:{kind:'flash',size:dim(2.5,5.8,2.5)},wedge:{kind:'wedge',size:dim(1.2,2.8,1.0)},
 smoke:{kind:'flash',size:dim(2.5,5.8,2.5)},frag:{kind:'flash',size:dim(2.5,3.8,2.5)},
 'door-charge':{kind:'misc',size:dim(3.5,4,2)},'chem-light':{kind:'misc',size:dim(1,3,1)}
};
const cosmetic:Readonly<Record<string,AttachmentId>>={'empty-holster':'rigid-holster','empty-pouch':'utility-pouch','empty-dump':'dump-pouch'};
export function unifiedLoadoutInput(source:UnifiedLoadoutSource):CarryInput{
 const {kit,wardrobe,magazines}=source,look=resolvedWardrobe(wardrobe,kit);
 // Mechanical belt identity, not a legacy cosmetic style alias, grants slots.
 const belt=beltStyleForEquipment(kit.slots.belt);
 const historicalWaist=['field-webbing','alice-lc2','m1956-lce','sadf-webbing'].includes(look.rigStyle);
 const authored=authoredRigStorageCells(look.rigStyle,wardrobe?.m1956Variant);
 const rigCells=look.rigStyle==='no-rig'?[]:source.rigCells??authored.magazines;
 const auxiliary=look.rigStyle==='no-rig'?[]:source.auxiliaryCells??authored.auxiliary;
 const armor=ARMOR_PROPORTIONS[look.armorStyle],frame=armorAttachmentFrame(look.armorStyle,look.top);
 const pack=proposedPackStyle(look.packStyle);
 const packCompatible=!!pack&&(PACK_PROFILES[pack].harness!=='direct'||supportsDirectPack(look.armorStyle));
 const storage=[...registeredRigStorage(rigCells),...registeredAuxiliaryStorage(auxiliary),
  ...(armor?modularArmorStorage(look.armorStyle,look.rigStyle,frame.front.x,armor.width,armor.top,armor.bottom):[]),
  ...clothingStorage(look.trousers,kit.slots.legs),...packStorage(look.packStyle,packCompatible)];
 const items:CarryItem[]=[];
 const add=(id:string,kind:CarryKind,dimensions:Dimensions,units=1)=>items.push({id,kind,dimensions,units});
 // The actual selected family envelope is reused as-is, not the old reduced
 // carry proxy. An unsupported native part is explicitly unfit, not guessed.
 const size=kit.slots.primary==='primary-shotgun'?null:nativeMagazineDimensions(source.primaryPart??defaultPart(kit.slots.primary));
 for(const m of magazines){
  if(m.weapon==='shotgun')continue;
  add(m.id,'primary-mag',size??dim(NaN,NaN,NaN));
 }
 if(kit.slots.primary==='primary-shotgun'){
  const shells=Number.isFinite(source.shellReserve)?Math.max(0,Math.floor(source.shellReserve!)):0;
  // These are read-only planning identities for existing reserve count,
  // not new physical ammunition inventory or serialized shell serials.
  for(let i=0;i<shells;i++)add('shell:'+i,'shell',dim(.95,2.3,.85));
 }
 const side=kit.secondary;
 if(side?.weapon){
  // Existing holster insertion envelope, not total exposed grip size.
  add('sidearm:'+side.weapon,'sidearm',dim(2.4,5.8,1.5));
  for(const m of side.spareMagazines)add(m.id,'secondary-mag',source.secondaryMagazineSize??nativeSecondaryMagazineSize(side.weapon));
 }
 if(kit.slots.medical==='medical-basic')add('kit:medical','medical',dim(4.0,3,2));
 if(kit.slots.medical==='medical-trauma')add('kit:medical','trauma',dim(5.5,6,3.5),2);
 const tool=utility[kit.slots.utility];if(tool)add('kit:utility',tool.kind,tool.size,tool.units);
 const field=kit.fieldInventory??initialFieldInventory(kit);
 for(const id of FIELD_ITEM_IDS){
  const def=fieldKind[id];if(!def||!FIELD_ITEMS[id].usable)continue;
  for(let i=0;i<fieldQuantity(field,id);i++)add('field:'+id+':'+i,def.kind,def.size,FIELD_ITEMS[id].spaces);
 }
 for(const slot of ['beltLeft','beltRight'] as const){
  const choice=wardrobe?.accessories?.[slot],holder=choice?cosmetic[choice]:undefined;if(!holder)continue;
  const variant=holder==='dump-pouch'?'rolled':'standard';
  items.push({id:'cosmetic:'+slot,kind:holder==='dump-pouch'?'dump':'cosmetic',
   dimensions:attachmentFootprint(holder,variant),holder,variant,optional:true});
 }
 const chestToHip=26-LEG_HIP_HEIGHT,waistObstacles:CarryVolume[]=[];
 if(!historicalWaist){
  const shift=rigContactFrame(look.armorStyle,look.top,look.rigStyle).rigShiftX;
  for(const c of [...rigCells,...auxiliary]){
   // Existing pouch bodies are authored box envelopes. Their closed or
   // empty status does not release the space they physically occupy.
   waistObstacles.push({min:[c.x+shift-c.depth/2,c.y+chestToHip-c.height/2,c.z-c.width/2],
    max:[c.x+shift+c.depth/2,c.y+chestToHip+c.height/2,c.z+c.width/2]});
  }
 }
 if(pack&&packCompatible&&pack!=='no-pack'){
  const fit=fitPack(pack,look.armorStyle,look.rigStyle,look.top,undefined,wardrobe?.packMount??'auto',belt);
  if(fit.compatible){
   const [x,y,z]=fit.center,[d,h,w]=PACK_PROFILES[pack].size;
   waistObstacles.push({min:[x-d/2,y+chestToHip-h/2,z-w/2],max:[x+d/2,y+chestToHip+h/2,z+w/2]});
  }
 }
 return {belt,holsterSide:side?.holster==='belt-left'?'left':'right',historicalWaist,storage,items,waistObstacles,chestToHip};
}
export function quoteUnifiedLoadout(source:UnifiedLoadoutSource){
 const input=unifiedLoadoutInput(source),manifest=resolveUnifiedCarry(input);
 return {input,manifest};
}

/** Projection for consumers that still use the V1 carrier enum. Armor shares
 * chest access timing, but the manifest retains its independent physical ID.
 * Return a detached, conserved candidate only; never commit from this helper.
 * V1 capacity validators cannot authorize the projected armor positions until
 * their own migration is complete. */
export function quoteUnifiedCarryTransaction(source:UnifiedLoadoutSource){
 const {input,manifest}=quoteUnifiedLoadout(source);
 if(!manifest.valid)return {ok:false as const,manifest,reason:manifest.unplaced.map(x=>x.id+': '+x.reason).join(' · ')};
 const audit=auditInitialUnifiedManifest(input,manifest);
 if(audit.length)return {ok:false as const,manifest,reason:audit.join(' · ')};
 const locations=new Map<string,Exclude<MagazineLocation,'overflow'>>();
 for(const p of manifest.placements)for(const id of p.itemIds)locations.set(id,p.carrier==='armor'?'rig':p.carrier);
 const kit=structuredClone(source.kit);
 const magazines=source.magazines.map(m=>({...m,location:locations.get(m.id)??m.location}));
 if(kit.secondary?.weapon)kit.secondary={...kit.secondary,spareMagazines:kit.secondary.spareMagazines.map(m=>({...m,location:locations.get(m.id)??m.location}))};
 const original=kit.fieldInventory??initialFieldInventory(kit),next:FieldInventory={version:1,stacks:[]};
 for(const id of FIELD_ITEM_IDS){
  const total=fieldQuantity(original,id);
  for(let i=0;i<total;i++){
   const loc=locations.get('field:'+id+':'+i);
   if(!loc||!FIELD_ITEMS[id].locations.includes(loc as FieldCarryLocation))
    return {ok:false as const,manifest,reason:'UNMAPPED FIELD ITEM '+id};
   const row=next.stacks.find(r=>r.itemId===id&&r.location===loc);
   if(row)row.quantity++;else next.stacks.push({itemId:id,location:loc,quantity:1});
  }
 }
 kit.fieldInventory=next;
 return {ok:true as const,kit,magazines,manifest,input};
}
