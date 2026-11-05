/**
 * D2 operator head accessories: the deliberately limited 19-model first wave.
 * Non-gameplay metadata. Model IDs are silhouettes; color, aperture and wearing
 * position are orthogonal options, never extra wardrobe cards.
 */
export const D2_FACEWEAR=[
 {id:'balaclava-one',name:'One-hole balaclava',kind:'fabric',modes:['standard']},
 {id:'balaclava-three',name:'Three-hole balaclava',kind:'fabric',modes:['three-hole','two-hole']},
 {id:'balaclava-open',name:'Open-face balaclava',kind:'fabric',modes:['standard']},
 {id:'gaiter',name:'Neck gaiter',kind:'fabric',modes:['lowered','mouth','nose']},
 {id:'shemagh',name:'Shemagh / field scarf',kind:'fabric',modes:['draped','face-wrap','head-wrap']},
 {id:'bandana',name:'Bandana',kind:'fabric',modes:['raised','lowered']},
 {id:'half-mask',name:'Tactical half-mask',kind:'shell',modes:['solid','mesh']},
 {id:'respirator-half',name:'Half-face respirator',kind:'respirator',modes:['twin-filter','compact-filter']},
 {id:'gas-gp5',name:'Hood gas mask',kind:'full-mask',modes:['standard']},
 {id:'gas-m17',name:'Cheek-filter gas mask',kind:'full-mask',modes:['standard']},
 {id:'gas-m40',name:'Canister gas mask',kind:'full-mask',modes:['standard']},
 {id:'gas-m50',name:'Panoramic gas mask',kind:'full-mask',modes:['standard']}
] as const;
export const D2_EYEWEAR=[
 {id:'glasses-standard',name:'Standard glasses',kind:'glasses',modes:['rectangular','round','heavy-square']},
 {id:'glasses-aviator',name:'Aviators',kind:'glasses',modes:['standard']},
 {id:'glasses-wrap',name:'Shooting glasses',kind:'glasses',modes:['standard']},
 {id:'glasses-shield',name:'Ballistic eyeshield',kind:'glasses',modes:['standard']},
 {id:'goggles-low',name:'Low-profile goggles',kind:'goggles',modes:['standard']},
 {id:'goggles-field',name:'Bulky field goggles',kind:'goggles',modes:['standard']},
 {id:'goggles-retro',name:'Vintage motor goggles',kind:'goggles',modes:['standard']}
] as const;
export type D2FacewearId=typeof D2_FACEWEAR[number]['id'];
export type D2EyewearId=typeof D2_EYEWEAR[number]['id'];
export type D2FaceMode=typeof D2_FACEWEAR[number]['modes'][number];
export type D2EyeMode=typeof D2_EYEWEAR[number]['modes'][number];
export const D2_FACE_SOLIDS=[
 'black','charcoal','olive','foliage','coyote','brown','off-white','winter-white'
] as const;
export const D2_MASK_SOLIDS=['black','charcoal','olive','foliage','coyote'] as const;
export type D2MaskSolid=typeof D2_MASK_SOLIDS[number];
export const D2_MASK_COLORS:Record<D2MaskSolid,{label:string;hex:number}>={
 black:{label:'Black rubber',hex:0x23282a},
 charcoal:{label:'Charcoal rubber',hex:0x3c4140},
 olive:{label:'Olive rubber',hex:0x454d3e},
 foliage:{label:'Foliage rubber',hex:0x58645b},
 coyote:{label:'Coyote shell',hex:0x776b58}
};
export const isD2MaskSolid=(v:unknown):v is D2MaskSolid=>
 typeof v==='string'&&(D2_MASK_SOLIDS as readonly string[]).includes(v);
export const D2_FRAME_SOLIDS=['black','gray','olive','tan','silver'] as const;
export const D2_LENS_TINTS=['clear','smoke','dark-smoke','amber','yellow','bronze','green','mirrored'] as const;
export const D2_GOGGLE_POSITIONS=['eyes','raised','neck'] as const;
export type D2FaceSolid=typeof D2_FACE_SOLIDS[number];
/** Deliberately muted and independent of hat, uniform and armor finishes. */
export const D2_FACE_SOLID_COLORS:Record<D2FaceSolid,{label:string;hex:number}>={
 black:{label:'Black',hex:0x222527},
 charcoal:{label:'Charcoal',hex:0x414447},
 olive:{label:'Olive drab',hex:0x525b43},
 foliage:{label:'Foliage green',hex:0x65736a},
 coyote:{label:'Coyote brown',hex:0x8c775c},
 brown:{label:'Field brown',hex:0x665343},
 'off-white':{label:'Off white',hex:0xb6b3a0},
 'winter-white':{label:'Winter white',hex:0xcbd0c9}
};
export const isD2FaceSolid=(v:unknown):v is D2FaceSolid=>
 typeof v==='string'&&(D2_FACE_SOLIDS as readonly string[]).includes(v);
/** Avoid a heavy head-wrap clipping through a ballistic helmet, hat or headset. */
export function effectiveD2FabricMode(facewear:string,mode:string|undefined,headwear:string){
 const entry=D2_FACEWEAR.find(x=>x.id===facewear);
 if(!entry)return undefined;
 const chosen=mode&&entry.modes.some(x=>x===mode)?mode:entry.modes[0];
 if(facewear==='shemagh'&&chosen==='head-wrap'&&headwear!=='bare')return 'face-wrap';
 return chosen;
}
export type D2FrameSolid=typeof D2_FRAME_SOLIDS[number];
export type D2LensTint=typeof D2_LENS_TINTS[number];
export const D2_FRAME_COLORS:Record<D2FrameSolid,{hex:number;label:string}>={
 black:{hex:0x24282b,label:'Black'},gray:{hex:0x5b6062,label:'Gray'},
 olive:{hex:0x596151,label:'Olive'},tan:{hex:0x937b59,label:'Tan'},
 silver:{hex:0x9ba2a2,label:'Silver'}
};
export const D2_LENS_MATERIALS:Record<D2LensTint,{hex:number;opacity:number;label:string}>={
 clear:{hex:0xb5ceca,opacity:.31,label:'Clear'},
 smoke:{hex:0x3a4449,opacity:.76,label:'Smoke'},
 'dark-smoke':{hex:0x222c32,opacity:.88,label:'Dark smoke'},
 amber:{hex:0xb2883a,opacity:.68,label:'Amber'},
 yellow:{hex:0xb5a157,opacity:.54,label:'Yellow'},
 bronze:{hex:0x7d6140,opacity:.72,label:'Bronze'},
 green:{hex:0x516e5f,opacity:.67,label:'Green'},
 mirrored:{hex:0x9baead,opacity:.88,label:'Muted mirror'}
};
export type D2GogglePosition=typeof D2_GOGGLE_POSITIONS[number];
export type D2AccessoryOptions={
 faceMode?:string;
 faceSolid?:D2FaceSolid;
 /** Print ID is validated by the existing approved camouflage policy at the wardrobe reader. */
 faceCamo?:string;
 faceCamoRoll?:number;
 eyeMode?:string;
 eyeFrame?:D2FrameSolid;
 eyeTint?:D2LensTint;
 eyePosition?:D2GogglePosition;
};
const faceIds=new Set<string>(D2_FACEWEAR.map(x=>x.id));
const eyeIds=new Set<string>(D2_EYEWEAR.map(x=>x.id));
export const isD2Facewear=(v:unknown):v is D2FacewearId=>
 typeof v==='string'&&faceIds.has(v);
export const isD2Eyewear=(v:unknown):v is D2EyewearId=>
 typeof v==='string'&&eyeIds.has(v);
export const isFullFaceMask=(id:string)=>D2_FACEWEAR.some(x=>x.id===id&&x.kind==='full-mask');
export const isGoggles=(id:string)=>D2_EYEWEAR.some(x=>x.id===id&&x.kind==='goggles');
const inList=(value:unknown,values:readonly string[]):value is string=>
 typeof value==='string'&&values.includes(value);
const faceDescriptor=(id:string)=>D2_FACEWEAR.find(x=>x.id===id);
const eyeDescriptor=(id:string)=>D2_EYEWEAR.find(x=>x.id===id);
/** Read legacy styles without forcing old saves to adopt invisible new models. */
export function migrateD2Facewear(id:unknown):{style:string;faceMode?:string}{
 if(typeof id!=='string')return {style:'face-none'};
 switch(id){
  case 'scarf':return {style:'shemagh',faceMode:'draped'};
  case 'gas-mask':return {style:'gas-m40',faceMode:'standard'};
  case 'face-none':return {style:'face-none'};
  default:return isD2Facewear(id)?{style:id}:{style:'face-none'};
 }
}
export function migrateD2Eyewear(id:unknown):{style:string;eyePosition?:D2GogglePosition;eyeTint?:D2LensTint}{
 switch(id){
  case 'clear-glasses':return {style:'glasses-standard',eyeTint:'clear'};
  case 'sunglasses':return {style:'glasses-wrap',eyeTint:'smoke'};
  case 'safety-glasses':return {style:'glasses-shield',eyeTint:'clear'};
  case 'goggles-down':return {style:'goggles-field',eyePosition:'eyes'};
  case 'goggles-up':return {style:'goggles-field',eyePosition:'raised'};
  case 'eyes-none':return {style:'eyes-none'};
  default:return isD2Eyewear(id)?{style:id}:{style:'eyes-none'};
 }
}
/** Normalize per-item values, tolerating older saves with absent D2 options. */
export function readD2AccessoryOptions(
 raw:unknown,faceId:string,eyeId:string
):D2AccessoryOptions{
 const out:D2AccessoryOptions={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 const v=raw as Partial<D2AccessoryOptions>;
 const f=faceDescriptor(faceId),e=eyeDescriptor(eyeId);
 if(f&&inList(v.faceMode,f.modes))out.faceMode=v.faceMode;
 if(e&&inList(v.eyeMode,e.modes))out.eyeMode=v.eyeMode;
 if(inList(v.faceSolid,D2_FACE_SOLIDS))out.faceSolid=v.faceSolid as D2FaceSolid;
 if(inList(v.eyeFrame,D2_FRAME_SOLIDS))out.eyeFrame=v.eyeFrame as D2FrameSolid;
 if(inList(v.eyeTint,D2_LENS_TINTS))out.eyeTint=v.eyeTint as D2LensTint;
 if(isGoggles(eyeId)&&inList(v.eyePosition,D2_GOGGLE_POSITIONS))
  out.eyePosition=v.eyePosition as D2GogglePosition;
 if(f?.kind==='fabric'&&typeof v.faceCamo==='string'&&v.faceCamo.length<70)
  out.faceCamo=v.faceCamo;
 if(Number.isInteger(v.faceCamoRoll)&&v.faceCamoRoll!>=0&&v.faceCamoRoll!<4096)
  out.faceCamoRoll=v.faceCamoRoll;
 return out;
}
export type D2HeadAssembly={
 facewear:string;headwear:string;eyewear:string;headset:string;
 eyewearHiddenReason?:string;
 headsetHiddenReason?:string;
 eyewearPlacement:'eyes'|'forehead'|'helmet'|'neck'|'hidden';
 hairCovered:boolean;
};
/** Render-only, non-destructive compatibility. Never changes actual kit slots. */
export function resolveD2HeadAssembly(input:{
 facewear:string;eyewear:string;headwear:string;headset:string;
 options?:D2AccessoryOptions;
}):D2HeadAssembly{
 const {facewear,eyewear,headwear,headset}=input;
 const hood=['balaclava-one','balaclava-three','balaclava-open','gas-gp5']
  .includes(facewear)||facewear==='shemagh'&&input.options?.faceMode==='head-wrap';
 // GP-5 rubber covers the entire scalp and ears. Hide intersecting gear
 // visually without erasing actual equipment or saved style preferences.
 const shownHeadwear=facewear==='gas-gp5'?'bare':headwear;
 let eye=eyewear,headsetVisible=headset;
 let placement:D2HeadAssembly['eyewearPlacement']='eyes';
 let eyewearHiddenReason:string|undefined;
 let headsetHiddenReason:string|undefined;
 if(isFullFaceMask(facewear)){
  eye='eyes-none';placement='hidden';
  eyewearHiddenReason='External glasses and goggles are covered by a full-face mask.';
  if(headset==='boom-headset'||headset==='helmet-ears'||
     facewear==='gas-gp5'&&headset!=='comms-none'){
   headsetVisible='comms-none';
   headsetHiddenReason='Headset geometry conflicts with this full-face mask.';
  }
 }else if(isGoggles(eyewear)){
  const requested=input.options?.eyePosition??'eyes';
  if(requested==='neck')placement='neck';
  else if(requested==='raised'){
   if(['ach','high-cut','pasgt','soviet-steel','high-cut-rails'].includes(headwear))
    placement='helmet';
   else if(headwear==='bare'||headwear==='beanie')placement='forehead';
   else placement='eyes'; // Incompatible brim: preserve preference, use safe effective position.
  }
 }
 return {
  facewear,headwear:shownHeadwear,eyewear:eye,headset:headsetVisible,
  eyewearHiddenReason,headsetHiddenReason,eyewearPlacement:placement,
  hairCovered:hood
 };
}
