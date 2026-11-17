/** E6.17: opt-in, observational main-pass draw/material attribution.
 * Uses Three's existing renderBufferDirect submission, never invokes a new
 * draw or WebGL synchronization. Clock costs are diagnostic observer overhead.
 */
export type MainPassMaterialType=Readonly<{type:string;draws:number}>;
export type MainPassMaterialInstance=Readonly<{
 id:string;label:string;type:string;draws:number;wallMs:number
}>;
export type MainPassFrame=Readonly<{
 renderBufferCalls:number;drawCalls:number;uniqueMaterials:number;
 opaqueDraws:number;transparentDraws:number;alphaTestDraws:number;
 instancedDraws:number;skinnedDraws:number;
 wallMs:number;reliable:boolean;
 materialTypes:readonly MainPassMaterialType[];
 ownerDraws:readonly {owner:string;draws:number}[];
 /** Top 16 actual non-shadow draw-source families per frame; sampled lower bound. */
 sourceDraws:readonly {source:string;draws:number}[];
 /** E6.19: exhaustive reason buckets for actual transparent submissions. */
 transparentRoles:readonly {role:string;draws:number}[];
 topMaterials:readonly MainPassMaterialInstance[];
}>;
type MaterialLike={id?:number;name?:string;type?:string;
 transparent?:boolean;alphaTest?:number};
type ObjectLike={isInstancedMesh?:boolean;isSkinnedMesh?:boolean;
 name?:string;geometry?:{type?:string};
 userData?:Record<string,unknown>;parent?:ObjectLike|null};
function renderOwner(object:ObjectLike):string{
 let current:ObjectLike|null|undefined=object;
 for(let depth=0;depth<20&&current;depth++,current=current.parent){
  const label=current.userData?.fieldworkRenderCategory;
  if(typeof label==='string'&&label.length)return label;
 }
 return 'unclassified';
}
/** E6.18a: stable provenance, not Three runtime IDs. Named fixture/
 * group ownership or an explicit fieldworkDrawFamily wins; unknown
 * meshes remain visibly marked instead of being assigned invented names.
 * This observer runs only under the existing coldBench opt-in.
 */
function renderSource(object:ObjectLike):string{
 const owner=renderOwner(object);
 let current:ObjectLike|null|undefined=object;
 let nearest='';
 for(let depth=0;depth<20&&current;depth++,current=current.parent){
  const tagged=current.userData?.fieldworkDrawFamily;
  if(typeof tagged==='string'&&tagged.trim()){
   nearest=tagged.trim();break;
  }
  if(!nearest&&typeof current.name==='string'&&current.name.trim())
   nearest=current.name.trim();
 }
 return [owner,nearest||'[unnamed]',object.geometry?.type||'unknown-geometry']
  .join('/');
}
/** First explicit authoring reason on mesh or nearest owning parent.
 * Role tags do NOT change whether a material is actually transparent.
 */
function transparencyRole(object:ObjectLike):string{
 let node:ObjectLike|null|undefined=object;
 for(let i=0;i<20&&node;i++,node=node.parent){
  const role=node.userData?.fieldworkTransparencyRole;
  if(typeof role==='string'&&role.length)return role;
 }
 return 'unclassified';
}
type RendererLike={
 renderBufferDirect?:(...args:unknown[])=>unknown;
 info:{render:{calls:number}};
};
type MutableMaterial={id:string;label:string;type:string;draws:number;wallMs:number};
const clean=(n:number)=>Number.isFinite(n)?Math.max(0,n):0;
export class LiveMainPassProfiler{
 readonly installed:boolean=false;
 last:MainPassFrame|null=null;
 private readonly inShadowPass:()=>boolean;
 private readonly now:()=>number;
 private active=false;private calls=0;private drawCalls=0;
 // This full actual-submission census is only for explicit E6.25 cold QA.
 // Avoid array/DOM work in production or other profiling configurations.
 private readonly e625Census=typeof location!=='undefined'&&
  new URLSearchParams(location.search).get('coldBench')==='1'&&
  new URLSearchParams(location.search).has('e625Character');
 private opaque=0;private transparent=0;private alphaTest=0;
 private instanced=0;private skinned=0;private elapsed=0;
 private reliable=true;
 private readonly materials=new Map<string,MutableMaterial>();
 private readonly types=new Map<string,number>();
 private readonly owners=new Map<string,number>();
 private readonly sources=new Map<string,number>();
 private readonly transparentRoles=new Map<string,number>();
 constructor(renderer:RendererLike,inShadowPass:()=>boolean,
  now:()=>number=()=>performance.now()){
  this.inShadowPass=inShadowPass;this.now=now;
  const original=renderer.renderBufferDirect;
  if(typeof original!=='function')return;
  const profiler=this;
  try{
   renderer.renderBufferDirect=function(this:unknown,...args:unknown[]){
    if(!profiler.active||profiler.inShadowPass())
     return Reflect.apply(original,this,args);
    // Three r180: (camera,scene,geometry,material,object,group).
    // We count actual submitted draw deltas, not object traversals.
    const material=(args[3]??{}) as MaterialLike;
    const object=(args[4]??{}) as ObjectLike;
    const before=renderer.info.render.calls;
    const started=profiler.now();
    try{return Reflect.apply(original,this,args);}
    finally{
     const wall=clean(profiler.now()-started);
     const after=renderer.info.render.calls;
     profiler.calls++;
     profiler.elapsed+=wall;
     if(!Number.isFinite(before)||!Number.isFinite(after)||after<before){
      profiler.reliable=false;
     }else if(after>before){
     const draws=after-before;
     profiler.drawCalls+=draws;
     const owner=renderOwner(object);
     profiler.owners.set(owner,(profiler.owners.get(owner)??0)+draws);
     const type=material.type||'UnknownMaterial';
     const surface=material.transparent?'transparent':
      (material.alphaTest??0)>0?'alpha-test':'opaque';
     const source=[renderSource(object),type,surface].join('/');
     profiler.sources.set(source,(profiler.sources.get(source)??0)+draws);
     const id=String(material.id??'unknown-'+type);
     const entry=profiler.materials.get(id)??{
      id,label:material.name||type,type,draws:0,wallMs:0
     };
     entry.draws+=draws;entry.wallMs+=wall;
     profiler.materials.set(id,entry);
     profiler.types.set(type,(profiler.types.get(type)??0)+draws);
     if(material.transparent){
      profiler.transparent+=draws;
      const role=transparencyRole(object);
      profiler.transparentRoles.set(role,
       (profiler.transparentRoles.get(role)??0)+draws);
     }
     else if((material.alphaTest??0)>0)profiler.alphaTest+=draws;
     else profiler.opaque+=draws;
     if(object.isInstancedMesh)profiler.instanced+=draws;
     if(object.isSkinnedMesh)profiler.skinned+=draws;
     }
    }
   };
   this.installed=renderer.renderBufferDirect!==original;
  }catch{/* Unsupported hook: render remains untouched. */}
 }
 capture<T>(render:()=>T):T{
  if(!this.installed)return render();
  if(this.active)throw Error('Nested E6.17 main-pass capture');
  this.active=true;this.last=null;this.calls=0;this.drawCalls=0;
  this.opaque=0;this.transparent=0;this.alphaTest=0;
  this.instanced=0;this.skinned=0;this.elapsed=0;
  this.reliable=true;this.materials.clear();this.types.clear();
  this.owners.clear();this.sources.clear();this.transparentRoles.clear();
  try{return render();}
  finally{
   const materialTypes=[...this.types].map(([type,draws])=>({type,draws}))
    .sort((a,b)=>b.draws-a.draws||a.type.localeCompare(b.type));
   const ownerDraws=[...this.owners].map(([owner,draws])=>({owner,draws}))
    .sort((a,b)=>b.draws-a.draws||a.owner.localeCompare(b.owner));
   const sourceDraws=[...this.sources].map(([source,draws])=>({source,draws}))
    .sort((a,b)=>b.draws-a.draws||a.source.localeCompare(b.source))
    .slice(0,16);
   const transparentRoles=[...this.transparentRoles]
    .map(([role,draws])=>({role,draws}))
    .sort((a,b)=>b.draws-a.draws||a.role.localeCompare(b.role));
   const topMaterials=[...this.materials.values()]
    .sort((a,b)=>b.draws-a.draws||a.id.localeCompare(b.id))
    .slice(0,12).map(m=>({...m,wallMs:Math.round(m.wallMs*10)/10}));
   // Unlike top-16 sampled attribution, this includes EVERY actual
   // non-shadow renderBufferDirect source in the last reliable 3D frame.
   // Parent fixture labels are only attached by the E6.25 cold benchmark.
   if(this.e625Census&&typeof window!=='undefined')Object.assign(window,{
    __fieldworkE625DrawTrace:{
     total:this.drawCalls,opaque:this.opaque,transparent:this.transparent,
     alphaTest:this.alphaTest,instanced:this.instanced,reliable:this.reliable,
     sources:[...this.sources].map(([source,draws])=>({source,draws}))
      .sort((a,b)=>a.source.localeCompare(b.source))
    }
   });
   this.last={
    renderBufferCalls:this.calls,drawCalls:this.drawCalls,
    uniqueMaterials:this.materials.size,opaqueDraws:this.opaque,
    transparentDraws:this.transparent,alphaTestDraws:this.alphaTest,
    instancedDraws:this.instanced,skinnedDraws:this.skinned,
    wallMs:Math.round(this.elapsed*10)/10,reliable:this.reliable,
    materialTypes,ownerDraws,sourceDraws,transparentRoles,topMaterials
   };
   this.active=false;
  }
 }
}
