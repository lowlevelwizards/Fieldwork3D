/** BP3 — staged attachment architecture for bespoke pack art.
 * Geometry is created on kit change only; pose output keeps the existing
 * animated pack parent. Fit is presentation, never a navigation collider.
 */
import * as THREE from 'three';
import {PACK_PROFILES,type PackStyle} from './operator-backpack-catalog.ts';
import {equipmentExterior} from './operator-equipment-exterior.ts';
import {packRibbon,packBox,packBuckle,finishPackArtwork,PACK_DETAIL,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
export const PACK_PIVOT:PackPoint=[-8.2,0,0];
export type PackMountSpec=Readonly<{
 size:PackPoint;centerY:number;bodyFaceX:number;
 upperY:number;lowerY:number;strapHalfWidth:number;
}>;
export type HarnessSpan=Readonly<{a:PackPoint;b:PackPoint;normal:PackPoint;width:number;thickness:number}>;
export type PackFit=Readonly<{
 style:PackStyle;compatible:boolean;reason?:string;
 /** Static body art offset relative to the existing animated parent. */
 offset:PackPoint;center:PackPoint;
 upperSeats:readonly PackPoint[];lowerSeats:readonly PackPoint[];
 spans:readonly HarnessSpan[];buckles:readonly PackPoint[];
 waistSpans?:readonly HarnessSpan[];waistBuckle?:PackPoint;
}>;
/** Provisional explicit direct-mount whitelist, subject to BP4 carrier art.
 * Bare clothing, concealed/soft armor and legacy vests cannot mount a panel. */
export function supportsDirectPack(armor:string){
 return armor==='plate-jpc'||armor==='plate-standard';
}
export function defaultPackMount(style:PackStyle):PackMountSpec{
 const size=PACK_PROFILES[style].size;
 const [d,h,w]=size;
 return {size,centerY:h>14?-.7:.4,bodyFaceX:d/2,
  upperY:h*.38,lowerY:-h*.38,strapHalfWidth:Math.min(4.6,w*.35)};
}
const point=(x:number,y:number,z:number):PackPoint=>[x,y,z];
export function fitPack(style:PackStyle,armor:string,rig:string,top:string,
 spec:PackMountSpec=defaultPackMount(style)):PackFit{
 const profile=PACK_PROFILES[style];
 const empty={style,offset:point(0,0,0),center:PACK_PIVOT,upperSeats:[],lowerSeats:[],spans:[],buckles:[]};
 if(profile.harness==='none')return {...empty,compatible:true};
 if(profile.harness==='direct'&&!supportsDirectPack(armor))
  return {...empty,compatible:false,reason:'COMPATIBLE REAR CARRIER MOUNT REQUIRED'};
 const fit=equipmentExterior(armor,rig,top);
 const [,h,w]=spec.size;
 const ys=[spec.centerY-h*.35,spec.centerY,spec.centerY+h*.35];
 const zs=[0,-w*.32,w*.32];
 const back=Math.min(...ys.flatMap(y=>zs.map(z=>fit.back(y,z))));
 const cx=back-spec.bodyFaceX-.12;
 const center=point(cx,spec.centerY,0);
 const offset=point(cx-PACK_PIVOT[0],spec.centerY-PACK_PIVOT[1],0);
 const upperSeats:PackPoint[]=[],lowerSeats:PackPoint[]=[],spans:HarnessSpan[]=[],buckles:PackPoint[]=[];
 for(const sign of [-1,1] as const){
  const z=sign*spec.strapHalfWidth;
  const upper=point(cx+spec.bodyFaceX,spec.centerY+spec.upperY,z);
  const lower=point(cx+spec.bodyFaceX,spec.centerY+spec.lowerY,z);
  upperSeats.push(upper);lowerSeats.push(lower);
  if(profile.harness==='direct')continue;
  const padded=profile.harness!=='light';
  const load=profile.harness==='load-bearing';
  const width=load?1.8:padded?PACK_DETAIL.paddedStrap:PACK_DETAIL.lightStrap,thickness=load?.44:padded?.32:.18;
  const shoulder=fit.shoulder(sign);
  const crownZ=sign*Math.min(Math.abs(shoulder[2]),Math.max(Math.abs(z),3.5));
  const crownY=shoulder[1]+thickness*.5+.08;
  const frontY=2.2,frontZ=sign*Math.min(5.2,Math.abs(crownZ)+.45);
  const front=point(fit.front(frontY,frontZ)+thickness*.5+.15,frontY,frontZ);
  const buckleY=-1.65,buckleZ=sign*5.45;
  const buckle=point(fit.front(buckleY,buckleZ)+thickness*.5+.15,buckleY,buckleZ);
  const flankX=0,flankY=-3.5;
  const flank=point(flankX,flankY,fit.side(flankY,flankX,sign)+sign*.18);
  const rearCrown=point(fit.back(5.0,crownZ)-.18,crownY,crownZ);
  const frontCrown=point(fit.front(5.0,crownZ)+.18,crownY,crownZ);
  const add=(a:PackPoint,b:PackPoint,normal:PackPoint,wide=width)=>{
   if(Math.hypot(...a.map((v,i)=>v-b[i]))>.001)spans.push({a,b,normal,width:wide,thickness});
  };
  add(upper,rearCrown,point(-1,1,0));
  add(rearCrown,frontCrown,point(0,1,0));
  add(frontCrown,front,point(1,1,0));
  add(front,buckle,point(1,0,0));
  add(buckle,flank,point(1,0,sign),width*.7);
  add(flank,lower,point(-1,0,sign),width*.65);
  buckles.push(buckle);
 }
 const waistSpans:HarnessSpan[]=[];
 let waistBuckle:PackPoint|undefined;
 // Comms uses a structured shoulder harness but not an expedition hip belt.
 if(style==='field-pack'||style==='rucksack'){
  const y=-6.6,thickness=.52,width=style==='rucksack'?2.1:1.65;
  const frontX=fit.front(y,0)+.35;
  waistBuckle=point(frontX+.2,y,0);
  for(const sign of [-1,1] as const){
   const rear=point(cx+spec.bodyFaceX,y,sign*spec.strapHalfWidth);
   const sideZ=fit.side(y,0,sign)+sign*.35;
   const flank=point(0,y,sideZ);
   const front=point(frontX,y,sideZ*.68);
   const end=point(frontX,y,sign*.55);
   waistSpans.push({a:rear,b:flank,normal:point(-1,0,sign),width,thickness},
    {a:flank,b:front,normal:point(1,0,sign),width,thickness},
    {a:front,b:end,normal:point(1,0,0),width:1.15,thickness:.3});
  }
 }
 return {style,compatible:true,center,offset,upperSeats,lowerSeats,spans,buckles,waistSpans,waistBuckle};
}
/** Chest-local static harness. The active pack shell lives below the
 * independently animated pack parent; only the bag-side seats move with it. */
export function buildPackHarness(fit:PackFit,m:PackMaterials){
 const root=new THREE.Group();root.name='authored-pack-harness-'+fit.style;
 if(!fit.compatible)return root;
 // Each side is one continuous folded webbing ribbon, without internal end caps.
 let chain:HarnessSpan[]=[];
 for(const span of fit.spans){
  if(chain.length&&chain[chain.length-1].b!==span.a){
   packRibbon(root,'shoulder-webbing',m.trim,chain);chain=[];
  }
  chain.push(span);
 }
 if(chain.length)packRibbon(root,'shoulder-webbing',m.trim,chain);
 if(fit.waistSpans?.length){
  packRibbon(root,'waist-left',m.trim,fit.waistSpans.slice(0,3));
  packRibbon(root,'waist-right',m.trim,fit.waistSpans.slice(3));
  if(fit.waistBuckle)packBox(root,'waist-buckle',m.dark,fit.waistBuckle,[.65,1.35,1.85]);
 }
 for(const [i,p] of fit.buckles.entries())packBuckle(root,'buckle-'+i,m,p,fit.style==='hydration'?.9:1.25);
 return finishPackArtwork(root);
}
/** Root metadata for BP4+ authors: authored model origin remains pack-local,
 * so fitting never rescales or changes the animated attachment parent. */
export function mountPackArtwork(root:THREE.Group,fit:PackFit){
 root.position.set(...fit.offset);root.visible=fit.compatible&&fit.style!=='no-pack';
 root.userData.fieldworkPackStyle=fit.style;
 return root;
}
