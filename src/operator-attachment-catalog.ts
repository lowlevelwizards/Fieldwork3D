/** BT3.0: carrier-neutral artwork definitions. +Z outward, +Y up, X tangent.
 * Origin is the carrier contact at the top of the hanging holder. No item
 * ownership, equipment issue or access timing is represented by this catalog.
 */
import type {BeltStyle} from './operator-belt-profile.ts';
import type {BeltFootprint,BeltRegion,BeltMountRequest} from './operator-belt-mounts.ts';
export type AttachmentCarrier='belt'|'rig'|'armor'|'pack';
export type AttachmentVariant='standard'|'compact'|'expanded'|'double'|'rolled';
export type AttachmentMaterial='fabric'|'dark'|'hardware'|'contents'|'accent';
export type AttachmentDefinition={
 name:string;category:'ammunition'|'holster'|'equipment'|'storage';
 footprint:BeltFootprint;variants:readonly AttachmentVariant[];
 beltStyles:readonly BeltStyle[];carriers:readonly AttachmentCarrier[];
 regions:readonly BeltRegion[];contents:number;interaction:readonly [number,number,number];
};
const all=['plain-belt','duty-belt','battle-belt','padded-belt'] as const;
const service=['duty-belt','battle-belt','padded-belt'] as const;
const modular=['battle-belt','padded-belt'] as const;
const hips=['left-hip','right-hip'] as const;
const sides=['front-left','front-right','left-hip','right-hip','rear-left','rear-right'] as const;
const rear=['rear','rear-left','rear-right','left-hip','right-hip'] as const;
const carriers=['belt','rig','armor','pack'] as const;
const d=(name:string,category:AttachmentDefinition['category'],width:number,height:number,depth:number,spaces:number,
 beltStyles:readonly BeltStyle[],regions:readonly BeltRegion[],contents:number,variants:readonly AttachmentVariant[]=['standard'],
 supported:readonly AttachmentCarrier[]=carriers):AttachmentDefinition=>({
 name,category,footprint:{width,height,depth,spaces},beltStyles,regions,contents,variants,carriers:supported,
 interaction:[0,0,depth*.5]
});
export const ATTACHMENTS={
 'pistol-mag-pouch':d('Pistol magazine pouch','ammunition',2.4,4.3,2.0,1,all,sides,1,['standard','double']),
 'primary-mag-pouch':d('Primary magazine pouch','ammunition',4.85,6.6,3.0,1,service,sides,1,['standard','compact','expanded']),
 'shell-holder':d('Shotgun shell holder','ammunition',5.6,3.75,1.9,1,all,hips,4),
 'rigid-holster':d('Rigid holster','holster',3.65,6.6,2.25,1,all,hips,1,['standard'],['belt']),
 'flap-holster':d('Flap holster','holster',4.1,6.6,2.5,1,all,hips,1,['standard'],['belt']),
 'medical-pouch':d('Medical pouch','equipment',5.55,3.9,3.0,1,service,rear,1),
 'radio-holder':d('Radio holder','equipment',3.35,6.8,2.65,1,all,sides,1),
 'flashlight-holder':d('Flashlight holder','equipment',2.65,5.5,2.65,1,all,sides,1),
 'restraint-pouch':d('Restraint pouch','equipment',3.9,3.5,2.2,0,all,hips,0),
 'wedge-holder':d('Door wedge holder','equipment',3.5,3.8,2.4,1,service,sides,2),
 'grenade-pouch':d('Grenade pouch','equipment',3.3,4.1,3.0,1,service,sides,1),
 'utility-pouch':d('General-purpose pouch','storage',4.65,4.15,3.2,1,service,rear,0,['standard','compact','expanded']),
 'dump-pouch':d('Dump pouch','storage',7.5,7.1,4.8,1,modular,rear,0,['standard','rolled'],['belt','rig'])
} satisfies Record<string,AttachmentDefinition>;
export type AttachmentId=keyof typeof ATTACHMENTS;
export const ATTACHMENT_IDS=Object.keys(ATTACHMENTS) as AttachmentId[];
export function validAttachmentId(id:unknown):id is AttachmentId{
 return typeof id==='string'&&Object.prototype.hasOwnProperty.call(ATTACHMENTS,id);
}
export function attachmentVariant(id:AttachmentId,variant:AttachmentVariant='standard'){
 const p=ATTACHMENTS[id];return p.variants.includes(variant)?variant:'standard';
}
export function attachmentFootprint(id:AttachmentId,requested:AttachmentVariant='standard'):BeltFootprint{
 const v=attachmentVariant(id,requested),f=ATTACHMENTS[id].footprint;
 if(v==='double')return {...f,width:4.8,spaces:2};
 if(v==='rolled')return {...f,width:5.8,height:2.8,depth:2.65};
 if(v==='compact')return id==='primary-mag-pouch'?{...f,width:4.45,height:5.35,depth:2.9}:{...f,width:f.width*.83,height:f.height*.85,depth:f.depth*.9};
 if(v==='expanded')return {...f,width:f.width*1.22,height:Math.min(8,f.height*1.12),depth:f.depth*1.18};
 return {...f};
}
export function attachmentContentSlots(id:AttachmentId,variant:AttachmentVariant='standard'){
 return attachmentVariant(id,variant)==='double'?2:ATTACHMENTS[id].contents;
}
export function attachmentMountRequest(id:string,family:AttachmentId,style:BeltStyle,
 variant:AttachmentVariant='standard',preferred?:BeltRegion,cosmetic=false):BeltMountRequest|null{
 const p=ATTACHMENTS[family];
 if(!p.beltStyles.includes(style)||!p.carriers.includes('belt'))return null;
 const footprint=attachmentFootprint(family,variant);
 return {id,footprint:{...footprint,spaces:cosmetic?0:footprint.spaces},preferred,allowed:p.regions};
}
