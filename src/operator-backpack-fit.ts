import {equipmentAssembly,rearCarrierMount,sharedRigClips,type PackMountMode} from './operator-equipment-assembly.ts';
/** BP3 — staged attachment architecture for bespoke pack art.
 * Geometry is created on kit change only; pose output keeps the existing
 * animated pack parent. Fit is presentation, never a navigation collider.
 */
import * as THREE from 'three';
import {PACK_PROFILES,type PackStyle} from './operator-backpack-catalog.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {BELT_PROFILES,canonicalBeltStyle} from './operator-belt-profile.ts';
import {equipmentExterior} from './operator-equipment-exterior.ts';
import {packRibbon,packBox,packBuckle,finishPackArtwork,PACK_DETAIL,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
export const PACK_PIVOT:PackPoint=[-8.2,0,0];
export type PackMountSpec=Readonly<{
 size:PackPoint;centerY:number;bodyFaceX:number;
 upperY:number;lowerY:number;strapHalfWidth:number;
}>;
export type HarnessSpan=Readonly<{a:PackPoint;b:PackPoint;normal:PackPoint;width:number;thickness:number}>;
export type PackFit=Readonly<{
 style:PackStyle;compatible:boolean;reason?:string;mode?:PackMountMode;
 /** Static body art offset relative to the existing animated parent. */
 offset:PackPoint;center:PackPoint;
 upperSeats:readonly PackPoint[];lowerSeats:readonly PackPoint[];
 spans:readonly HarnessSpan[];buckles:readonly PackPoint[];
 waistSpans?:readonly HarnessSpan[];waistBuckle?:PackPoint;
}>;
/** Provisional explicit direct-mount whitelist, subject to BP4 carrier art.
 * Bare clothing, concealed/soft armor and legacy vests cannot mount a panel. */
export function supportsDirectPack(armor:string){
 return rearCarrierMount(armor);
}
export function defaultPackMount(style:PackStyle):PackMountSpec{
 const size=PACK_PROFILES[style].size;
 const [d,h,w]=size;
 return {size,centerY:h>14?-.7:.4,bodyFaceX:d/2,
  upperY:h*.38,lowerY:-h*.38,strapHalfWidth:Math.min(4.6,w*.35)};
}
const point=(x:number,y:number,z:number):PackPoint=>[x,y,z];
export function fitPack(style:PackStyle,armor:string,rig:string,top:string,
 spec:PackMountSpec=defaultPackMount(style),requested:PackMountMode='auto',belt='no-belt'):PackFit{
 const profile=PACK_PROFILES[style];
 const assembly=equipmentAssembly(style,armor,rig,requested);
 const empty={style,mode:assembly.mode,offset:point(0,0,0),center:PACK_PIVOT,upperSeats:[],lowerSeats:[],spans:[],buckles:[]};
 if(profile.harness==='none')return {...empty,compatible:true};
 if(!assembly.compatible)
  return {...empty,compatible:false,reason:'COMPATIBLE REAR CARRIER MOUNT REQUIRED'};
 const fit=equipmentExterior(armor,rig,top,assembly.sharedRig);
 const [,h,w]=spec.size;
 const ys=[spec.centerY-h*.35,spec.centerY,spec.centerY+h*.35];
 const zs=[0,-w*.32,w*.32];
 const back=Math.min(...ys.flatMap(y=>zs.map(z=>fit.back(y,z))));
 const cx=back-spec.bodyFaceX-(style==='field-pack'?.06:.025);
 const center=point(cx,spec.centerY,0);
 const offset=point(cx-PACK_PIVOT[0],spec.centerY-PACK_PIVOT[1],0);
 const upperSeats:PackPoint[]=[],lowerSeats:PackPoint[]=[],spans:HarnessSpan[]=[],buckles:PackPoint[]=[];
 for(const sign of [-1,1] as const){
  const z=sign*spec.strapHalfWidth;
  const upper=point(cx+spec.bodyFaceX,spec.centerY+spec.upperY,z);
  const lower=point(cx+spec.bodyFaceX,spec.centerY+spec.lowerY,z);
  upperSeats.push(upper);lowerSeats.push(lower);
  if(assembly.direct)continue;
  const padded=profile.harness!=='light';
  const load=profile.harness==='load-bearing';
  const width=load?1.8:padded?PACK_DETAIL.paddedStrap:PACK_DETAIL.lightStrap,thickness=load?.44:padded?.32:.18;
  const frame=rigContactFrame(armor,top,rig);
  const desiredZ=sign*Math.min(5.75,Math.max(Math.abs(z),Math.abs(frame.shoulderRight.z)+(assembly.externalRig?1.0:.1)));
  const contour=fit.shoulderContour(sign,desiredZ,width,thickness);
  const crownZ=contour.crown[2];
  const shared=sharedRigClips(frame,sign);
  const frontY=3.5,frontZ=sign*Math.min(6.2,Math.abs(crownZ)+.25);
  const front=assembly.sharedRig?shared.upper:point(fit.front(frontY,frontZ)+thickness*.5-.03,frontY,frontZ);
  const buckleY=-1.65,buckleZ=sign*Math.min(6.6,Math.abs(frontZ)+.28);
  const buckle=point(fit.front(buckleY,buckleZ)+thickness*.5+.025,buckleY,buckleZ);
  const flankY=-3.5;
  // Use two actual side contacts rather than a diagonal through the torso.
  const sideFrontX=fit.front(flankY,0)*.62,sideRearX=fit.back(flankY,0)*.62;
  const sideFront=point(sideFrontX,flankY,fit.side(flankY,sideFrontX,sign)+sign*(thickness*.5+.035));
  const sideRear=point(sideRearX,flankY,fit.side(flankY,sideRearX,sign)+sign*(thickness*.5+.035));
  const add=(a:PackPoint,b:PackPoint,normal:PackPoint,wide=width)=>{
   if(Math.hypot(...a.map((v,i)=>v-b[i]))>.001)spans.push({a,b,normal,width:wide,thickness});
  };
  add(upper,contour.rear,point(-1,1,0));
  add(contour.rear,contour.crown,point(0,1,0));
  add(contour.crown,contour.front,point(0,1,0));
  add(contour.front,front,point(1,1,0));
  if(assembly.sharedRig){
   buckles.push(front);
   add(shared.lower,sideFront,point(1,0,sign),width*.7);
  }else{
   add(front,buckle,point(1,0,0));
   add(buckle,sideFront,point(1,0,sign),width*.7);
  }
  add(sideFront,sideRear,point(0,0,sign),width*.65);
  add(sideRear,lower,point(-1,0,sign),width*.65);
  if(!assembly.sharedRig)buckles.push(buckle);
 }
 const waistSpans:HarnessSpan[]=[];
 let waistBuckle:PackPoint|undefined;
 // Comms uses a structured shoulder harness but not an expedition hip belt.
 if(style==='field-pack'||style==='rucksack'){
  // Hip belt is a body layer; pouches and rig wings stay outside it.
  // Position relative to belt profile, not the top of arbitrary cargo.
  const beltProfile=BELT_PROFILES[canonicalBeltStyle(belt)??'no-belt'];
  const y=beltProfile.height>0?-6.4+beltProfile.height*.28:-6.75;
  const thickness=.42,width=style==='rucksack'?1.8:1.5;
  const body=equipmentExterior(armor,'no-rig',top);
  const frontX=body.front(y,0)+thickness*.5+.035;
  waistBuckle=point(frontX+.13,y,0);
  for(const sign of [-1,1] as const){
   const rear=point(cx+spec.bodyFaceX,y,sign*spec.strapHalfWidth);
   const rearX=body.back(y,0)*.70,flankX=body.front(y,0)*.70;
   const rearFlank=point(rearX,y,body.side(y,rearX,sign)+sign*(thickness*.5+.04));
   const frontFlank=point(flankX,y,body.side(y,flankX,sign)+sign*(thickness*.5+.04));
   const front=point(frontX,y,sign*Math.abs(frontFlank[2])*.72);
   const end=point(frontX,y,sign*.55);
   waistSpans.push({a:rear,b:rearFlank,normal:point(-1,0,sign),width,thickness},
    {a:rearFlank,b:frontFlank,normal:point(0,0,sign),width,thickness},
    {a:frontFlank,b:front,normal:point(1,0,sign),width,thickness},
    {a:front,b:end,normal:point(1,0,0),width:1.05,thickness:.24});
  }
 }
 return {style,mode:assembly.mode,compatible:true,center,offset,upperSeats,lowerSeats,spans,buckles,waistSpans,waistBuckle};
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
  packRibbon(root,'waist-left',m.trim,fit.waistSpans.slice(0,fit.waistSpans.length/2));
  packRibbon(root,'waist-right',m.trim,fit.waistSpans.slice(fit.waistSpans.length/2));
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
