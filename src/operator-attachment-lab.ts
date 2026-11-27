import {nativeEquippedMagazine} from './operator-attachment-reference.ts';
import {attachmentFootprint} from './operator-attachment-catalog.ts';
/** BT3.7: isolated artwork audition, never serialized to a loadout. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import {ATTACHMENTS,ATTACHMENT_IDS,attachmentMountRequest,validAttachmentId,
 type AttachmentId,type AttachmentVariant} from './operator-attachment-catalog.ts';
import {resolveBeltMounts,type BeltRegion} from './operator-belt-mounts.ts';
import type {BeltStyle} from './operator-belt-profile.ts';
import {syncGearMarkedMaterials} from './operator-gear-pixel-art.ts';
import {createAttachmentVisual,placeAttachmentVisual,setAttachmentSampleCount,type AttachmentVisual,type AttachmentSamples} from './operator-attachment-visuals.ts';
type FixtureItem={id:AttachmentId;region:BeltRegion;variant?:AttachmentVariant};
export const ATTACHMENT_FIXTURES={
 plainclothes:{style:'plain-belt',items:[{id:'rigid-holster',region:'right-hip'}]},
 patrol:{style:'duty-belt',items:[{id:'rigid-holster',region:'right-hip'},{id:'radio-holder',region:'front-left'},{id:'restraint-pouch',region:'rear'}]},
 tactical:{style:'battle-belt',items:[{id:'primary-mag-pouch',region:'left-hip'},{id:'grenade-pouch',region:'front-right'},{id:'medical-pouch',region:'rear'}]},
 field:{style:'padded-belt',items:[{id:'utility-pouch',region:'left-hip',variant:'expanded'},{id:'dump-pouch',region:'rear'},{id:'primary-mag-pouch',region:'right-hip'}]}
} satisfies Record<string,{style:BeltStyle;items:FixtureItem[]}>;
export const ATTACHMENT_FIXTURE_IDS=Object.keys(ATTACHMENT_FIXTURES) as (keyof typeof ATTACHMENT_FIXTURES)[];
export function attachmentFixture(choice:string,variant:AttachmentVariant='standard'):{style:BeltStyle;items:FixtureItem[]}|null{
 if(Object.prototype.hasOwnProperty.call(ATTACHMENT_FIXTURES,choice))
  return ATTACHMENT_FIXTURES[choice as keyof typeof ATTACHMENT_FIXTURES];
 if(validAttachmentId(choice))return {style:'padded-belt' as BeltStyle,items:[{id:choice,region:(choice==='dump-pouch'?'rear':'right-hip') as BeltRegion,variant}]};
 return null;
}
type Preview={key:string;group:THREE.Group;visuals:AttachmentVisual[];accent:THREE.MeshStandardMaterial;status:string};
const previews=new WeakMap<OperatorRig,Preview>();
export function clearAttachmentPreview(rig:OperatorRig){
 const p=previews.get(rig);if(!p)return;
 p.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 p.accent.dispose();p.group.removeFromParent();previews.delete(rig);
}
export function updateAttachmentPreview(rig:OperatorRig,choice:string,variant:AttachmentVariant,countMode:string,visible:boolean,samples:AttachmentSamples={}){
 const fixture=attachmentFixture(choice,variant);
 if(!fixture||!visible){const p=previews.get(rig);if(p)p.group.visible=false;return '';}
 const key=choice+':'+variant+':'+(samples.primaryPart??'reference')+':'+(samples.secondaryMagazine?.geometry.uuid??'reference');
 let p=previews.get(rig);
 if(p?.key!==key){
  clearAttachmentPreview(rig);
  const group=new THREE.Group();group.name='lab-only-attachment-audition';rig.hip.add(group);
  const accent=new THREE.MeshStandardMaterial({color:0xb76442,roughness:.9});
  const palette={fabric:rig.gearMaterial,dark:rig.weaponDark,hardware:rig.weaponSteel,contents:rig.bootMaterial,accent};
  // Use the native selected magazine only if its envelope fits. Try the
  // larger dedicated variant first; otherwise use closed utility storage
  // rather than scaling the native item or letting it poke through.
  const items:FixtureItem[]=fixture.items.map(item=>{
   if(item.id!=='primary-mag-pouch'||!samples.primaryPart)return item;
   const g=nativeEquippedMagazine(samples.primaryPart);
   if(!g)return {...item,id:'utility-pouch',variant:'standard'};
   const box=g.boundingBox!,w=box.max.x-box.min.x,h=box.max.y-box.min.y,d=box.max.z-box.min.z;
   g.dispose();
   for(const variant of [item.variant??'standard','expanded'] as const){
    const f=attachmentFootprint(item.id,variant);
    if(w<=f.width*.99-.88&&d<=f.depth-.88&&h<=f.height)return {...item,variant};
   }
   return {...item,id:'utility-pouch',variant:'expanded'};
  });
  const requests=items.flatMap((item,i)=>{
   const req=attachmentMountRequest(String(i),item.id,fixture.style,item.variant,item.region);
   return req?[req]:[];
  });
  const result=resolveBeltMounts(fixture.style,requests);
  const visuals=result.mounts.map(m=>{
   const item=items[Number(m.id)];
   const visual=createAttachmentVisual(item.id,palette,item.variant,true,samples);
   placeAttachmentVisual(visual,m.socket);group.add(visual.root);return visual;
  });
  const status=visuals.length+'/'+fixture.items.length+' mounted · '+result.rejected.length+' fit rejections';
  p={key,group,visuals,accent,status};previews.set(rig,p);
 }
 p.group.visible=true;
 syncGearMarkedMaterials(rig.gearMaterial);syncGearMarkedMaterials(rig.weaponDark);syncGearMarkedMaterials(rig.bootMaterial);
 for(const v of p.visuals){
  const n=v.contents.length;
  setAttachmentSampleCount(v,countMode==='empty'?0:countMode==='partial'?Math.max(0,n-1):n);
 }
 // Show only the fixture belt and its artwork; legacy props remain unchanged
 // in the actual kit. Visibility is restored by the next normal pose update.
 return p.status;
}
export function populateAttachmentPreviewOptions(select:HTMLSelectElement){
 select.add(new Option('OFF — normal equipment','off'));
 for(const id of ATTACHMENT_FIXTURE_IDS)select.add(new Option(id.toUpperCase()+' FIXTURE',id));
 for(const id of ATTACHMENT_IDS)select.add(new Option(ATTACHMENTS[id].name,id));
}
