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
 {id:'glasses-wrap',name:'Wraparound tactical glasses',kind:'glasses',modes:['standard']},
 {id:'glasses-shield',name:'Ballistic eyeshield',kind:'glasses',modes:['standard']},
 {id:'goggles-low',name:'Low-profile goggles',kind:'goggles',modes:['standard']},
 {id:'goggles-field',name:'Bulky field goggles',kind:'goggles',modes:['standard']},
 {id:'goggles-retro',name:'Vintage round goggles',kind:'goggles',modes:['standard']}
] as const;
export type D2FacewearId=typeof D2_FACEWEAR[number]['id'];
export type D2EyewearId=typeof D2_EYEWEAR[number]['id'];
export type D2FaceMode=typeof D2_FACEWEAR[number]['modes'][number];
export type D2EyeMode=typeof D2_EYEWEAR[number]['modes'][number];
export const D2_FACE_SOLIDS=[
 'black','charcoal','olive','foliage','coyote','brown','off-white','winter-white'
] as const;
export const D2_FRAME_SOLIDS=['black','gray','olive','tan','silver'] as const;
export const D2_LENS_TINTS=['clear','smoke','dark-smoke','amber','yellow','bronze','green','mirrored'] as const;
export const D2_GOGGLE_POSITIONS=['eyes','raised','neck'] as const;
export type D2FaceSolid=typeof D2_FACE_SOLIDS[number];
export type D2FrameSolid=typeof D2_FRAME_SOLIDS[number];
export type D2LensTint=typeof D2_LENS_TINTS[number];
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
 facewear:string;eyewear:string;headset:string;
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
 let eye=eyewear,headsetVisible=headset;
 let placement:D2HeadAssembly['eyewearPlacement']='eyes';
 let eyewearHiddenReason:string|undefined;
 let headsetHiddenReason:string|undefined;
 if(isFullFaceMask(facewear)){
  eye='eyes-none';placement='hidden';
  eyewearHiddenReason='External glasses and goggles are covered by a full-face mask.';
  if(headset==='boom-headset'||headset==='helmet-ears'){
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
  facewear,eyewear:eye,headset:headsetVisible,
  eyewearHiddenReason,headsetHiddenReason,eyewearPlacement:placement,
  hairCovered:hood
 };
}
