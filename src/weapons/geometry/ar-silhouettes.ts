/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';
import {AR_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';

export function addARFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material){
 const parts=build.parts,material=[steel,dark,wood] as const;
 const index:Record<SlotName,number>={stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0};
 const p=(slot:SlotName,outline:Outline,depth:number,finish:0|1|2=1)=>
  addOutline(root,slot,parts[slot],index[slot]++,outline,depth,material[finish]);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:0|1|2=1)=>addCuboid(root,slot,parts[slot],index[slot]++,
   x,y,z,w,h,d,material[finish]);
 const line=(slot:SlotName,start:readonly [number,number],end:readonly [number,number],
  width:number,depth:number,finish:0|1|2=1)=>
  addBar(root,slot,parts[slot],index[slot]++,start,end,width,depth,material[finish]);

 // Upper: flat/retro identities differ chiefly in the visible TOP silhouette.
 p('receiver',[[-6.35,-.9],[-6.35,1.25],[-5.4,1.75],[3.6,1.75],
  [3.85,.55],[3.65,-.9]],3.5,0);
 p('receiver',[[-5.55,-1.1],[-2.1,-2.15],[2.2,-2.15],
  [3.45,-.85],[-5.55,-.85]],3.0,1);
 b('receiver',-5.7,-.2,0,1.1,3.5,3.6,1);
 // A distinct, tapered LOWER magwell makes the magazine part of the receiver,
 // not an object attached to the back of the fore-end.
 const m=AR_VISUAL_ANATOMY;
 p('receiver',[[m.magwellCenterX-1.2,m.magwellTopY],
   [m.magwellCenterX+1.25,m.magwellTopY],
   [m.magwellCenterX+1.0,m.magwellBottomY],
   [m.magwellCenterX-1.0,m.magwellBottomY]],3.2,1);
 const carry=['ar-a1','ar-a2','ar-retro'].includes(parts.receiver);
 if(carry){
  const heavy=parts.receiver==='ar-a2';
  // Open carry handle: a real gap between posts, never a solid cap block.
  line('receiver',[-4.35,1.8],[-4.35,3.7],heavy?1.25:.85,2.15,0);
  // Extended bridge, with a forward-slanting nose leg for the retro CAR.
  line('receiver',[1.45,1.8],[2.05,3.7],.86,2.05,0);
  b('receiver',-1.24,3.7,0,7.15,.82,2.05,0);
  if(heavy)b('receiver',-4.35,2.4,0,1.6,.95,2.4,1);
 }else{
  // One continuous low top plane; the extra rear nub did not read at game scale.
  b('receiver',-1.5,2.05,0,8.3,.65,2.65,1);
 }

 // Stock: fixed triangular stock versus open shoulder / sliding-carbine outline.
 if(parts.stock==='ar-fixed'){
  // One five-sided classic rifle wedge, including its rear plate.
  p('stock',[[-14.0,.65],[-6.05,.7],[-6.05,-1.7],
   [-9.0,-3.1],[-14.0,-2.4]],3.8,1);
 }else{
  const compact=parts.stock==='ar-compact';
  const rear=compact?-12.4:-13.0;
  // The stock body, not the telescoping connector, owns the silhouette.
  // Keep a short, visibly embedded bridge with intentional overlap at both ends.
  b('stock',-7.25,.05,0,3.6,1.45,1.9,0);
  p('stock',[[rear,.65],[rear+1.25,.95],[rear+4.2,.55],
   [rear+4.2,-1.7],[rear+1.0,-2.9],[rear,-2.15]],
   compact?4.0:3.75,compact?2:1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly';
 p('grip',shiftProfile(modern?
  [[-2.2,-1.7],[.6,-1.7],[.45,-5.25],[-.45,-5.85],[-2.7,-5.65]]:
  [[-2.0,-1.7],[.4,-1.7],[-.2,-5.75],[-2.45,-5.7]],
  m.gripShiftX),modern?3.25:2.95,1);

 // Thin, unmistakable STANAG shapes; an understated bottom kick is the
 // only change of direction. All variants enter the same receiver magwell.
 const mag=parts.magazine;
 const magTop=m.magazineTopY;
 if(mag==='ar-mag20')
  p('magazine',[[.12,magTop],[2.0,magTop],[2.08,-6.22],
   [.18,-6.22]],2.7,0);
 else if(mag==='ar-magpoly')
  p('magazine',[[.08,magTop],[2.13,magTop],[2.25,-4.65],
   [2.72,-7.15],[.65,-7.3],[.28,-4.7]],3.15,1);
 else
  p('magazine',[[.1,magTop],[2.05,magTop],[2.17,-4.7],
   [2.62,-7.35],[.7,-7.45],[.24,-4.72]],2.8,0);

 // Four outside envelopes: triangular ribless, rounded, slim retro, heavy rail.
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const end=long?15.25:short?15.95:13.9;
 // A slight deliberate overlap avoids the visible receiver/guard seam.
 const start=3.55;
 if(guard==='ar-triangle'){
  // One long block with an iconic triangular taper, no tiny rail strips.
  p('handguard',[[start,1.65],[end,1.15],[end,-1.15],
   [start,-1.8]],3.85,1);
 }else if(guard==='ar-round'||guard==='ar-carbine'||
   guard==='ar-car15-ribbed'){
  const retro=guard==='ar-car15-ribbed';
  p('handguard',retro?
   [[start,1.25],[start+1.0,1.52],[end-.65,1.37],
    [end,-.75],[end-.55,-1.42],[start+.4,-1.55]]:
   [[start,1.35],[start+.8,1.7],[end-.7,1.6],
    [end,-.9],[end-.6,-1.65],[start+.5,-1.65]],
   retro?3.15:3.85,1);
 }else{
  const ris=guard==='ar-risii';
  // Single squared shell and its raised rail, rather than stacked strips.
  p('handguard',ris?
   [[start,-1.65],[start,1.45],[start+.65,1.68],
    [end-.6,1.68],[end,1.08],[end,-1.43]]:
   [[start,-1.65],[start,1.55],
    [end-.55,1.55],[end,1.05],[end,-1.4]],
   ris?4.6:4.0,ris?2:1);
  b('handguard',(start+end)/2,1.86,0,end-start,.64,
   ris?4.15:3.7,ris?2:0);
 }

 // All variants share the authoritative X=19.5 tip: only visual profile varies.
 const barrelEnd=19.5;
 const noseStart=short?15.7:long?15.1:13.7;
 b('barrel',(noseStart+barrelEnd)/2,0,0,barrelEnd-noseStart,1.25,1.4,0);
 // Old-style raised front sight, absent on compact modern rail silhouette.
 if(!short){
  // Oversized A-frame front sight: genuine open V negative space.
  // Wide squat A-frame silhouette; a visible V gap, not a needle-like spike.
  line('barrel',[16.12,.35],[16.83,2.72],.40,1.8,0);
  line('barrel',[17.54,.35],[16.83,2.72],.40,1.8,0);
 }else b('barrel',19.06,0,0,.88,1.75,1.9,1);
}
