/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';
import {AR_STANAG_METAL} from './weapon-visual-palette.ts';
import {AR_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';

export function addARFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material){
 const parts=build.parts,material=[steel,dark,wood,AR_STANAG_METAL] as const;
 const index:Record<SlotName,number>={stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0};
 const p=(slot:SlotName,outline:Outline,depth:number,finish:0|1|2|3=1)=>
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
 p('receiver',[[m.magwellCenterX-1.86,m.magwellTopY],
   [m.magwellCenterX+1.86,m.magwellTopY],
   [m.magwellCenterX+1.68,m.magwellBottomY],
   [m.magwellCenterX-1.60,m.magwellBottomY]],3.25,1);
 const carry=['ar-a1','ar-a2','ar-retro'].includes(parts.receiver);
 if(carry){
  const heavy=parts.receiver==='ar-a2';
  // Open carry handle: a real gap between posts, never a solid cap block.
  line('receiver',[-4.35,1.8],[-4.35,3.7],heavy?1.25:.85,2.15,0);
  // The CAR nose leg leans BACK at the top (the opposite of R3.2).
  // A small bridge overhang ahead of that leg is intentional.
  if(parts.receiver==='ar-retro')
   line('receiver',[2.25,1.8],[1.55,3.7],.86,2.05,0);
  else line('receiver',[1.55,1.8],[1.55,3.7],.9,2.05,0);
  b('receiver',-1.15,3.7,0,7.3,.82,2.05,0);
  if(heavy)b('receiver',-4.35,2.4,0,1.6,.95,2.4,1);
 }else{
  // One continuous low top plane; the extra rear nub did not read at game scale.
  b('receiver',-1.5,2.05,0,8.3,.65,2.65,1);
 }

 // A single textured side mark replaces tiny modeled receiver hardware.
 // Receiver-side mark is taller, directly OVER the magazine insertion.
 addWeaponPixelMark(root,'ar-port',m.portX,m.portY,1.82,
  m.portWidthX,m.portHeightY);

 // Stock: fixed triangular stock versus open shoulder / sliding-carbine outline.
 if(parts.stock==='ar-fixed'){
  // One five-sided classic rifle wedge, including its rear plate.
  // Rearward X extension ONLY, with less Z thickness than R3.2.
  p('stock',[[-15.15,.65],[-6.05,.7],[-6.05,-1.7],
   [-9.0,-3.1],[-15.15,-2.4]],3.35,1);
 }else{
  const compact=parts.stock==='ar-compact';
  const rear=compact?-13.85:-14.45;
  // Hold the forward joint constant while extending the rear in X.
  // Never enlarge stock Z to simulate a longer silhouette.
  const front=compact?-8.4:-8.6;
  b('stock',-7.65,.05,0,4.2,1.45,1.9,0);
  p('stock',[[rear,.65],[rear+1.2,.95],[front,.55],
   [front,-1.7],[rear+1.05,-2.65],[rear,-2.12]],
   compact?3.35:3.25,compact?2:1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly';
 // The grip belongs to the BACK of the lower receiver. Its upper end
 // vanishes into the receiver, and it remains slimmer in both X and Z.
 p('grip',shiftProfile(modern?
  [[-2.1,-1.65],[.35,-1.65],[.2,-5.25],[-.5,-5.85],[-2.3,-5.65]]:
  [[-1.95,-1.65],[.25,-1.65],[-.25,-5.75],[-2.20,-5.7]],
  m.gripShiftX),m.gripDepthZ,1);

 // IMPORTANT: Side ELEVATION uses X/Y. The requested thinness is Z,
 // not an X-squashed stick. Restore broad magazine contour, narrow its depth.
 const mag=parts.magazine;
 const magTop=m.magazineTopY;
 const magLeft=m.magwellCenterX-m.magazineWidthX/2;
 const magRight=m.magwellCenterX+m.magazineWidthX/2;
 if(mag==='ar-mag20')
  p('magazine',[[magLeft,magTop],[magRight,magTop],
   [magRight+.12,-6.22],[magLeft+.12,-6.22]],m.magazineDepthZ,3);
 else if(mag==='ar-magpoly')
  p('magazine',[[magLeft,magTop],[magRight,magTop],
   [magRight+.12,-4.75],[magRight+.55,-7.2],
   [magLeft+.65,-7.3],[magLeft+.12,-4.72]],m.magazineDepthZ+.12,1);
 else
  p('magazine',[[magLeft,magTop],[magRight,magTop],
   [magRight+.1,-4.78],[magRight+.48,-7.35],
   [magLeft+.6,-7.45],[magLeft+.12,-4.72]],m.magazineDepthZ,3);

 // Four outside envelopes: triangular ribless, rounded, slim retro, heavy rail.
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail','ar-pri-tube'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const commando=guard==='ar-733-ribbed';
 const end=guard==='ar-pri-tube'?14.8:long?15.25:short?15.95:commando?12.9:13.9;
 // A slight deliberate overlap avoids the visible receiver/guard seam.
 const start=3.55;
 if(guard==='ar-pri-tube'){
  // Long faceted PRI tube with one continuous rail and a connected rear bridge.
  p('handguard',[[start,-1.5],[start,1.25],[start+.7,1.62],
   [end-.8,1.62],[end,1.0],[end,-1.25],[end-.8,-1.65]],3.5,1);
  b('handguard',(start+end)/2,1.94,0,end-start,.62,2.8,0);
  b('handguard',2.6,1.91,0,3.6,.48,2.45,0);
  addWeaponPixelMark(root,'pri-vents',(start+end)/2,.1,1.88,end-start-2.0,.9);
 }else if(guard==='ar-triangle'){
  // One long block with an iconic triangular taper, no tiny rail strips.
  // A1's thick rear triangular mass narrows to the distinctive long fore-end.
  p('handguard',[[start,1.55],[start+.9,1.77],[end-.6,1.07],
   [end,-.8],[end-1.0,-1.18],[start,-1.8]],3.85,1);
 }else if(guard==='ar-round'||guard==='ar-carbine'||
   guard==='ar-car15-ribbed'||guard==='ar-733-ribbed'){
  const retro=guard==='ar-car15-ribbed'||commando;
  p('handguard',retro?
   [[start,1.25],[start+1.0,1.52],[end-.65,1.37],
    [end,-.75],[end-.55,-1.42],[start+.4,-1.55]]:
   [[start,1.35],[start+.8,1.7],[end-.7,1.6],
    [end,-.9],[end-.6,-1.65],[start+.5,-1.65]],
   retro?3.15:3.85,1);
  if(commando)b('handguard',start+.55,.08,0,.62,2.9,3.35,0);
 }else{
  const ris=guard==='ar-risii';
  // Single squared shell and its raised rail, rather than stacked strips.
  p('handguard',ris?
   [[start,-1.54],[start,1.28],[start+.5,1.46],
    [start+.9,1.62],[end-1.35,1.62],[end-.8,1.25],
    [end,.92],[end,-1.28],[end-1.0,-1.64]]:
   [[start,-1.65],[start,1.55],
    [end-.55,1.55],[end,1.05],[end,-1.4]],
   ris?4.6:4.0,ris?2:1);
  b('handguard',(start+end)/2,1.86,0,end-start,.64,
   ris?4.15:3.7,ris?2:0);
  if(ris)addWeaponPixelMark(root,'ris-panel',(start+end)/2,.2,2.34,
   end-start-1.65,1.16);
  if(guard==='ar-m5-rail')addWeaponPixelMark(root,'ris-panel',
   (start+end)/2,.15,2.04,end-start-2.3,.84);
 }

 // All variants share the authoritative X=19.5 tip: only visual profile varies.
 const barrelEnd=19.5;
 const noseStart=parts.barrel==='ar-733-115'?12.75:
  parts.barrel==='ar-spr18'?14.55:short?15.7:long?15.1:13.7;
 b('barrel',(noseStart+barrelEnd)/2,0,0,barrelEnd-noseStart,1.25,1.4,0);
 // Old-style raised front sight, absent on compact modern rail silhouette.
 if(!short&&parts.barrel!=='ar-spr18'){
  // Oversized A-frame front sight: genuine open V negative space.
  // Wide squat A-frame silhouette; a visible V gap, not a needle-like spike.
  line('barrel',[16.24,.35],[16.83,2.72],.34,1.8,0);
  line('barrel',[17.42,.35],[16.83,2.72],.34,1.8,0);
 }else if(parts.barrel==='ar-spr18'){
  b('barrel',16.25,.92,0,1.2,.5,1.45,1);
  b('barrel',18.93,0,0,1.14,1.62,1.85,1);
 }else b('barrel',19.06,0,0,.88,1.75,1.9,1);
}
