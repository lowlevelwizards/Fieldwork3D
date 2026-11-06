/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,type Outline,type SlotName} from './profile-primitives.ts';
import {AR_STANAG_METAL,AR_STANAG_RIB,AR_MUTED_FDE} from './weapon-visual-palette.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines,arMagazinePolyBaseplate} from './ar-magazine-profiles.ts';
import {AR_BARREL_ART,AR_VISUAL_AXIS_Y} from './ar-barrel-profiles.ts';
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
 const frame=(slot:SlotName,outer:Outline,inner:Outline,depth:number,finish:0|1|2=0)=>
  addProfileFrame(root,slot,parts[slot],index[slot]++,outer,inner,depth,material[finish]);

 // Upper: flat/retro identities differ chiefly in the visible TOP silhouette.
 p('receiver',[[-6.35,-.9],[-6.35,1.25],[-5.4,1.75],[3.6,1.75],
  [3.85,.55],[3.65,-.9]],3.5,0);
 p('receiver',[[-5.55,-1.1],[-2.1,-2.15],[2.2,-2.15],
  [3.45,-.85],[-5.55,-.85]],3.0,1);
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
 // R4.6: the charging handle is a substantial, seated rear shelf.
 b('receiver',-5.92,1.59,0,1.68,.80,3.90,0);
 // Square-ended forward assist: front intersects body while rear projects
 // back/outboard. Not a tiny inclined slash or a mirrored detail.
 const assist=b('receiver',-1.93,.53,1.80,2.35,.48,.31,1);
 assist.rotation.z=-.19;
 assist.rotation.y=.18;

 // Fixed M16 stocks: one long triangular wedge, no rectangular belly.
 if(parts.stock==='ar-fixed'||parts.stock==='ar-fixed-a2'){
  const a2=parts.stock==='ar-fixed-a2';
  // A1/A2 retain their relative stock lengths. Both become shorter,
  // taller and substantially fuller at the attachment wrist.
  const back=a2?-14.30:-13.74;
  p('stock',[[back,a2?1.20:1.14],[-6.12,.98],[-6.02,-1.04],
   [back+.17,a2?-4.18:-4.04]],3.18,1);
  b('stock',back+.045,a2?-1.49:-1.45,0,.30,
   a2?5.46:5.28,3.22,0);
 }else{
  const compact=parts.stock==='ar-compact';
  const m4=parts.stock==='ar-stock-m4';
  const rear=compact?-13.85:m4?-14.25:-14.45;
  const front=compact?-8.4:m4?-8.48:-8.6;
  b('stock',-7.65,.35,0,4.2,1.45,1.9,0);
  p('stock',compact?
   // A thick compact SOPMOD-like cheek shape, without Z inflation.
   [[rear,1.12],[rear+1.12,1.36],[front,.91],
    [front,-1.25],[rear+1.48,-3.68],[rear,-3.54]]:
   m4?
   // Classic M4 stock: high tube, massive wedge under the rear cheek.
   // Simplified M4 shell: full-length FLAT comb, short flat rear
   // heel and one bold diagonal joining its forward collar.
   [[rear,1.47],[front,1.47],[front,-.75],
    [rear+2.0,-4.55],[rear+.28,-4.55],[rear,-4.13]]:
   // Early sliding Fiberlite shape is simpler and visually lighter.
   // Retro CAR: single thick shape; the lower diagonal reads as a shadow.
   [[rear,.72],[front,.67],[front,-1.24],
    [rear+1.35,-2.40],[rear,-1.98]],
   compact?3.35:m4?3.25:3.0,compact?2:1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly'||parts.grip==='ar-grip-poly-fde';
 // The grip belongs to the BACK of the lower receiver. Its upper end
 // vanishes into the receiver, and it remains slimmer in both X and Z.
 const gripProfile=shiftProfile(modern?
  [[-2.10,-1.84],[.35,-1.84],[-.73,-5.24],[-1.79,-5.85],[-3.36,-5.68]]:
  [[-1.95,-1.84],[.25,-1.84],[-1.16,-5.71],[-3.25,-5.71]],
  m.gripShiftX,.50);
 if(parts.grip==='ar-grip-poly-fde')
  addOutline(root,'grip',parts.grip,index.grip++,gripProfile,
   m.gripDepthZ,AR_MUTED_FDE);
 else p('grip',gripProfile,m.gripDepthZ,1);

 // R4.6: derived from the AK's constant-normal-width magazine ribbon.
 // The metal presses follow exactly the same centerline. No disconnected
 // underside plate or square polymer panel texture.
 const mag=parts.magazine;
 const magStyle=mag==='ar-mag20'?'20':mag==='ar-magpoly'?'poly':'30';
 const curve=arMagazineCurve(magStyle,m.magwellCenterX,m.magazineTopY,
  m.magazineWidthX,m.magazineDepthZ);
 p('magazine',arMagazineOutline(curve),m.magazineDepthZ,
  magStyle==='poly'?1:3);
 for(const outline of arMagazineRibOutlines(curve)){
  const rib=addOutline(root,'magazine',mag,index.magazine++,
   outline,m.magazineDepthZ+.075,AR_STANAG_RIB);
  rib.castShadow=false;rib.receiveShadow=false;
 }
 if(magStyle==='poly'){
  // Substantial near-tan bottom cap follows the same tangent and toe angle.
  addOutline(root,'magazine',mag,index.magazine++,
   arMagazinePolyBaseplate(curve),m.magazineDepthZ+.12,AR_MUTED_FDE);
 }

 // One elevated axis shared by all AR barrels, guards, and front sight bases.
 // Keep a deliberate squared delta ring where conventional handguards meet
 // the receiver. A PRI tube instead uses its own larger rear collar.
 const gh=(outline:Outline,depth:number,finish:0|1|2=1)=>
  p('handguard',outline.map(([x,y])=>[x,y+AR_VISUAL_AXIS_Y] as [number,number]),
   depth,finish);
 const gb=(x:number,y:number,z:number,w:number,h:number,d:number,
  finish:0|1|2=1)=>b('handguard',x,y+AR_VISUAL_AXIS_Y,z,w,h,d,finish);
 const gm=(mark:Parameters<typeof addWeaponPixelMarkPair>[1],
  x:number,y:number,z:number,w:number,h:number)=>
  addWeaponPixelMarkPair(root,mark,x,y+AR_VISUAL_AXIS_Y,z,w,h);
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail','ar-pri-tube'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const retro=guard==='ar-car15-ribbed'||guard==='ar-733-ribbed';
 const end=guard==='ar-pri-tube'?15.70:long?14.1:
  retro?11.8:guard==='ar-risii'?14.2:short?15.05:12.2;
 const start=3.55; // deliberate slight overlap with receiver upper
 if(guard!=='ar-pri-tube')
  gh([[start-.36,1.55],[start+.46,1.37],[start+.46,-1.16],
   [start-.36,-1.38]],4.06,0);
 if(guard==='ar-pri-tube'){
  const tube=addFacetedTube(root,'handguard',parts.handguard,index.handguard++,
   start,end,1.82,material[1]);
  tube.position.y=AR_VISUAL_AXIS_Y;
  gb(start+.35,0,0,.70,3.25,3.75,0);
  // Preserve the Mod 0 elevated bridge over the six-sided PRI tube.
  gb((start+end)/2,2.06,0,end-start,.56,2.8,0);
  gb(2.65,2.06,0,3.85,.52,2.6,0);
  gm('pri-vents',(start+end)/2,.18,1.90,end-start-1.7,.83);
 }else if(guard==='ar-triangle'){
  gh([[start,1.45],[start+.55,1.74],
   [end-1.10,1.08],[end,.58],[end,-.9],
   [end-1.0,-1.16],[start,-1.73]],3.65,1);
  // Broad lower bevel and dark, physically plausible upper vent marks.
  gh([[start,-.96],[end-.85,-.82],
   [end-1.0,-1.16],[start,-1.73]],3.76,0);
  gm('a1-vents',(start+end)/2,.91,1.91,end-start-1.82,.79);
 }else if(guard==='ar-round'||guard==='ar-carbine'||retro){
  gh(retro?
   [[start,1.26],[start+.88,1.48],[end-.5,1.45],
    [end,-.75],[end-.55,-1.46],[start+.35,-1.53]]:
   [[start,1.42],[start+.75,1.77],[end-.75,1.69],
    [end,-.78],[end-.65,-1.71],[start+.45,-1.76]],
   retro?3.15:3.85,1);
  if(retro)gb(start+.32,.04,0,.53,2.88,3.32,0);
  // Rounded stock plastic: full-depth circumferential bands with one long
  // horizontal mold seam; NOT rail teeth or ventilation windows.
  gm(retro?'car-ribs':'poly-ribs',(start+end)/2,.1,
   retro?1.66:2.00,end-start-1.9,2.28);
 }else{
  const ris=guard==='ar-risii';
  const covered=!ris;
  const span=end-start,center=(start+end)/2;
  // Step the cross section at top, side and bottom instead of a solid box.
  gh(ris?
   [[start,-1.50],[start,1.28],[start+.45,1.51],
    [end-.70,1.51],[end,.66],[end,-1.16],[end-.63,-1.58]]:
   [[start,-1.55],[start,1.49],
    [end-.60,1.49],[end,.90],[end,-1.48]],
   ris?3.72:3.17,ris?2:1);
  gb(center,1.87,0,span,.62,ris?3.42:3.12,0);
  gb(center,-1.83,0,span-.70,.48,ris?2.48:2.27,0);
  for(const side of [-1,1])
   gb(center,.07,side*(ris?2.07:1.77),span-1.20,.58,.42,0);
  if(covered)
   for(const side of [-1,1])
    gb(center,.14,side*2.035,span-2.1,1.0,.19,1);
  // Three or four large physical rail blocks. Any further precision
  // belongs in the nearest-neighbor texture rather than more triangles.
  const teeth=guard==='ar-m5-rail'?4:3;
  for(let i=0;i<teeth;i++){
   const x=start+1.34+i*(span-2.68)/(teeth-1);
   gb(x,2.31,0,.59,.31,ris?3.16:2.85,0);
  }
  gm(guard==='ar-m5-rail'?'m5-panel':
   guard==='ar-quad'?'ras-panel':'ris-panel',center,.14,
   ris?2.31:2.155,span-2.1,ris?.94:.83);
 }

 // The barrel is the only authority for its own muzzle and front-sight X.
 // A short retro barrel can have a fixed A-frame; the handguard is irrelevant.
 const tip=barrelArt.muzzleX,sight=barrelArt.sightX;
 const barrelStart=Math.min(end-.7,(sight??tip)-1.35);
 b('barrel',(barrelStart+tip)/2,AR_VISUAL_AXIS_Y,0,tip-barrelStart,
  barrelArt.barrelHeight,barrelArt.barrelDepth,0);
 if(sight!==null&&(barrelArt.sight==='a1'||barrelArt.sight==='a2')){
  // R4.5: a right vertical FRONT (towards muzzle), one boldly sloped REAR.
  // The tower roof aligns with the canonical carry-handle / rear-sight line.
  frame('barrel',[[sight-1.20,.83],[sight+.83,.83],
    [sight+.83,4.02],[sight-.34,4.02]],
   [[sight-.56,1.34],[sight+.02,3.26],
    [sight+.40,3.26],[sight+.40,1.34]],1.47);
 }else if(sight!==null){
  // Simplified flip-up Mk12 front sight, on the raised barrel center.
  b('barrel',sight,1.36,0,.92,.54,1.4,1);
  p('barrel',[[sight-.27,1.62],[sight+.35,1.62],
   [sight+.24,2.37],[sight-.12,2.37]],1.4,0);
 }
 if(barrelArt.profile==='government'||barrelArt.profile==='service'){
  // One oversized government step, not small machining details.
  if(tip-(sight??tip)>1.2)
   b('barrel',tip-1.05,AR_VISUAL_AXIS_Y,0,1.18,barrelArt.barrelHeight+.18,1.52,0);
 }
 // A few iconic muzzle masses; the muzzle tip X remains authoritative.
 // USGI birdcages get TWO wide black slots, not a fully machined cylinder.
 const birdcage=(length:number,height:number,depth:number)=>{
  b('barrel',tip-length/2,AR_VISUAL_AXIS_Y,0,length,height,depth,0);
  addWeaponPixelMarkPair(root,'ar-birdcage',tip-length*.47,AR_VISUAL_AXIS_Y,
   depth/2+.07,length*.70,height*.62);
 };
 if(barrelArt.profile==='spr'){
  b('barrel',tip-1.34,AR_VISUAL_AXIS_Y,0,.66,1.91,1.94,1);
  b('barrel',tip-.46,AR_VISUAL_AXIS_Y,0,.90,1.73,1.82,1);
 }else if(barrelArt.profile==='cqb'){
  birdcage(1.05,1.92,2.00);
  b('barrel',tip-.18,AR_VISUAL_AXIS_Y,0,.34,2.02,2.05,0);
 }else if(parts.barrel==='ar-145'){
  birdcage(1.07,1.35,1.48);
 }else if(parts.barrel==='ar-20'){
  birdcage(1.02,1.36,1.54);
 }else{
  // A2-family birdcage on the 733, M4A1, M16A2 and M16A4.
  birdcage(1.24,1.77,1.87);
  b('barrel',tip-1.11,AR_VISUAL_AXIS_Y,0,.24,1.92,1.94,1);
 }

}
