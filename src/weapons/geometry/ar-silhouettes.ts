/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,addFacetedTube,addProfileFrame,type Outline,type SlotName} from './profile-primitives.ts';
import {AR_STANAG_METAL} from './weapon-visual-palette.ts';
import {AR_BARREL_ART} from './ar-barrel-profiles.ts';
import {AR_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark,addWeaponPixelMarkPair} from './weapon-pixel-detail.ts';

export function addARFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material){
 const parts=build.parts,material=[steel,dark,wood,AR_STANAG_METAL] as const;
 const barrelArt=AR_BARREL_ART[parts.barrel];
 if(!barrelArt)throw new Error('Unknown AR art barrel: '+parts.barrel);
 const index:Record<SlotName,number>={stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0};
 const p=(slot:SlotName,outline:Outline,depth:number,finish:0|1|2|3=1)=>
  addOutline(root,slot,parts[slot],index[slot]++,outline,depth,material[finish]);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:0|1|2=1)=>addCuboid(root,slot,parts[slot],index[slot]++,
   x,y,z,w,h,d,material[finish]);
 const line=(slot:SlotName,start:readonly [number,number],end:readonly [number,number],
  width:number,depth:number,finish:0|1|2=1)=>
  addBar(root,slot,parts[slot],index[slot]++,start,end,width,depth,material[finish]);
 const frame=(slot:SlotName,outer:Outline,inner:Outline,depth:number,finish:0|1|2=0)=>
  addProfileFrame(root,slot,parts[slot],index[slot]++,outer,inner,depth,material[finish]);

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
  const a2=parts.receiver==='ar-a2';
  const retro=parts.receiver==='ar-retro';
  // R4.4: one connected chunky frame with a true empty trapezoid.
  // The upper bridge is continuous; no overlapping posts or roof seams.
  frame('receiver',[[-4.80,1.63],[2.30,1.63],[1.82,4.02],[-4.68,4.02]],
   [[-3.48,2.15],[-3.45,3.24],[.84,3.24],[1.18,2.15]],2.22);
  if(a2){
   // One meaningful rear sight wedge rather than several knobs.
   p('receiver',[[-5.05,2.04],[-4.96,3.72],
    [-3.93,3.74],[-3.45,2.80],[-3.45,2.04]],2.35,1);
  }
 }else{
  // Low flat-top without a permanently molded carry handle.
  b('receiver',-1.5,2.05,0,8.3,.65,2.65,1);
 }

 // A single textured side mark replaces tiny modeled receiver hardware.
 // Receiver-side mark is taller, directly OVER the magazine insertion.
 addWeaponPixelMark(root,'ar-port',m.portX,m.portY,1.82,
  m.portWidthX,m.portHeightY);
 // Deliberate trigger-guard lower edge; the space above it stays transparent.
 line('receiver',[-2.57,-2.64],[-.58,-2.58],.25,1.9,0);

 // Fixed M16 stocks: one long triangular wedge, no rectangular belly.
 if(parts.stock==='ar-fixed'||parts.stock==='ar-fixed-a2'){
  const a2=parts.stock==='ar-fixed-a2';
  const back=a2?-16.35:-15.65;
  p('stock',[[back,.93],[-6.12,.78],[-6.02,-.67],
   [back+.15,a2?-3.55:-3.40]],3.18,1);
  b('stock',back+.04,-1.28,0,.30,a2?4.48:4.28,3.20,0);
 }else{
  const compact=parts.stock==='ar-compact';
  const m4=parts.stock==='ar-stock-m4';
  const rear=compact?-13.85:m4?-14.25:-14.45;
  const front=compact?-8.4:m4?-8.48:-8.6;
  b('stock',-7.65,.05,0,4.2,1.45,1.9,0);
  p('stock',compact?
   // A thick compact SOPMOD-like cheek shape, without Z inflation.
   [[rear,.95],[rear+1.12,1.17],[front,.78],
    [front,-1.58],[rear+1.1,-3.03],[rear,-2.42]]:
   m4?
   [[rear,.82],[rear+1.08,1.02],[front,.60],
    [front,-1.46],[rear+1.45,-2.85],[rear,-2.35]]:
   // Early sliding Fiberlite shape is simpler and visually lighter.
   // Retro CAR: single thick shape; the lower diagonal reads as a shadow.
   [[rear,.72],[front,.67],[front,-1.24],
    [rear+1.35,-2.40],[rear,-1.98]],
   compact?3.35:m4?3.25:3.0,compact?2:1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly';
 // The grip belongs to the BACK of the lower receiver. Its upper end
 // vanishes into the receiver, and it remains slimmer in both X and Z.
 p('grip',shiftProfile(modern?
  [[-2.1,-1.60],[.35,-1.65],[-.38,-5.20],[-1.13,-5.86],[-2.92,-5.65]]:
  [[-1.95,-1.60],[.25,-1.65],[-.60,-5.66],[-2.92,-5.72]],
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
   [magRight+.1,-4.78],[magRight+.62,-7.35],
   [magLeft+.55,-7.45],[magLeft+.12,-4.72]],m.magazineDepthZ,3);
 // Bold base plate and restrained pressed-metal details, not separate rib meshes.
 const mag20=mag==='ar-mag20',magPoly=mag==='ar-magpoly';
 b('magazine',m.magwellCenterX+(mag20?.10:.42),mag20?-6.19:-7.33,0,
  m.magazineWidthX+(mag20?.12:.28),.23,m.magazineDepthZ+.12,0);
 addWeaponPixelMarkPair(root,mag20?'ar-mag-stamp20':
  magPoly?'ar-poly-panel':'ar-mag-stamp30',
  m.magwellCenterX+(mag20?.07:.22),mag20?-4.43:-5.12,
  m.magazineDepthZ/2+.10,m.magazineWidthX-.55,mag20?2.85:4.15);

 // Four outside envelopes: triangular ribless, rounded, slim retro, heavy rail.
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail','ar-pri-tube'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const commando=guard==='ar-733-ribbed';
 const end=guard==='ar-pri-tube'?15.70:long?14.1:
  guard==='ar-car15-ribbed'||commando?11.8:
  guard==='ar-risii'?14.2:short?15.05:12.2;
 // A slight deliberate overlap avoids the visible receiver/guard seam.
 const start=3.55;
 if(guard==='ar-pri-tube'){
  // A genuinely faceted cross-section, not a 3D cuboid that just says PRI.
  addFacetedTube(root,'handguard',parts.handguard,index.handguard++,
   start,end,1.82,material[1]);
  b('handguard',start+.35,0,0,.70,3.25,3.75,0);
  // The upper rail and rear bridge overlap: no floating join.
  b('handguard',(start+end)/2,2.06,0,end-start,.56,2.8,0);
  b('handguard',2.65,2.06,0,3.85,.52,2.6,0);
  addWeaponPixelMarkPair(root,'pri-vents',(start+end)/2,.18,1.90,
   end-start-1.7,.83);
 }else if(guard==='ar-triangle'){
  // A1: long clean taper with a slimmer front and strongly faceted shoulder.
  p('handguard',[[start,1.45],[start+.55,1.74],
   [end-1.10,1.08],[end,.58],[end,-.9],
   [end-1.0,-1.16],[start,-1.73]],3.65,1);
  // One strong underside plane, and a compact rear retaining collar.
  p('handguard',[[start,-.96],[end-.85,-.82],
   [end-1.0,-1.16],[start,-1.73]],3.76,0);
  b('handguard',start+.20,-.06,0,.46,3.1,3.84,0);
  addWeaponPixelMarkPair(root,'a1-vents',(start+end)/2,1.12,
   1.91,end-start-1.9,.42);
 }else if(guard==='ar-round'||guard==='ar-carbine'||
   guard==='ar-car15-ribbed'||guard==='ar-733-ribbed'){
  const retro=guard==='ar-car15-ribbed'||guard==='ar-733-ribbed';
  p('handguard',retro?
   [[start,1.26],[start+.88,1.48],[end-.5,1.45],
    [end,-.75],[end-.55,-1.46],[start+.35,-1.53]]:
   [[start,1.42],[start+.75,1.77],[end-.75,1.69],
    [end,-.78],[end-.65,-1.71],[start+.45,-1.76]],
   retro?3.15:3.85,1);
  if(retro){
   // Same retro furniture on 14.5 and 11.5: barrel creates the difference.
   b('handguard',start+.32,.04,0,.53,2.88,3.32,0);
  }
  addWeaponPixelMarkPair(root,retro?'car-ribs':'poly-ribs',
   (start+end)/2,.1,retro?1.67:2.01,end-start-1.9,1.45);
 }else{
  const ris=guard==='ar-risii';
  // Modern rails: one broad body and one joined, continuous upper rail.
  p('handguard',ris?
   [[start,-1.55],[start,1.32],[start+.45,1.53],
    [end-1.30,1.53],[end-.63,1.17],[end,.74],
    [end,-1.24],[end-.95,-1.66]]:
   [[start,-1.62],[start,1.55],
    [end-.57,1.55],[end,1.0],[end,-1.45]],
   ris?4.6:4.0,ris?2:1);
  b('handguard',(start+end)/2,1.88,0,end-start,.64,
   ris?4.12:3.68,ris?2:0);
  if(['ar-risii','ar-m5-rail','ar-quad'].includes(guard))
   addWeaponPixelMarkPair(root,guard==='ar-m5-rail'?'m5-panel':
    guard==='ar-quad'?'ras-panel':'ris-panel',(start+end)/2,.06,
    ris?2.38:guard==='ar-m5-rail'?2.10:2.10,
    end-start-1.65,ris?1.10:.90);
 }

 // The barrel is the only authority for its own muzzle and front-sight X.
 // A short retro barrel can have a fixed A-frame; the handguard is irrelevant.
 const tip=barrelArt.muzzleX,sight=barrelArt.sightX;
 const barrelStart=Math.min(end-.7,(sight??tip)-1.35);
 b('barrel',(barrelStart+tip)/2,0,0,tip-barrelStart,
  barrelArt.barrelHeight,barrelArt.barrelDepth,0);
 if(sight!==null&&(barrelArt.sight==='a1'||barrelArt.sight==='a2')){
  // Broad near-right-triangle A-frame, one mesh and one clean cavity.
  const heavy=barrelArt.sight==='a2';
  frame('barrel',[[sight-.93,.32],[sight+.97,.32],
    [sight+.17,heavy?2.84:2.72],[sight-.54,heavy?2.84:2.72]],
   [[sight-.51,.76],[sight-.38,2.10],
    [sight-.06,2.10],[sight+.42,.76]],heavy?1.92:1.78);
 }else if(sight!==null){
  // One compact folding SPR front sight, resting on the exposed barrel.
  b('barrel',sight,.84,0,.92,.54,1.4,1);
  p('barrel',[[sight-.27,1.1],[sight+.35,1.1],
   [sight+.24,1.85],[sight-.12,1.85]],1.4,0);
 }
 if(barrelArt.profile==='government'||barrelArt.profile==='service'){
  // One oversized government step, not small machining details.
  if(tip-(sight??tip)>1.2)
   b('barrel',tip-1.05,0,0,1.18,barrelArt.barrelHeight+.18,1.52,0);
 }
 if(barrelArt.profile==='spr'){
  b('barrel',tip-.72,0,0,1.40,1.68,1.82,1);
 }else if(barrelArt.profile==='cqb'){
  // Only a small visible muzzle cap survives past the RIS II.
  b('barrel',tip-.39,0,0,.78,1.7,1.94,1);
 }
}
