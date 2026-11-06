/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,type Outline,type SlotName} from './profile-primitives.ts';
import {AR_STANAG_METAL,AR_STANAG_RIB,AR_MUTED_FDE} from './weapon-visual-palette.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines,arMagazinePolyBaseplate,arMagazinePolyLowerFacet} from './ar-magazine-profiles.ts';
import {addARRailSegments} from './ar-rail-profiles.ts';
import {AR_BARREL_ART,AR_VISUAL_AXIS_Y} from './ar-barrel-profiles.ts';
import {AR_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark,addWeaponPixelMarkPair} from './weapon-pixel-detail.ts';

export function addARFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material,
 showFactoryMuzzle=true){
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
 // R4.7: one articulated lower receiver, not an uninterrupted horizontal
 // slab. The two angled underside changes frame the grip and magwell.
 p('receiver',[[-5.55,-.98],[-4.68,-1.47],[-3.08,-2.24],
  [-1.16,-2.24],[-.60,-1.92],[1.82,-2.22],
  [2.35,-1.98],[3.45,-.84],[-5.55,-.84]],3.0,1);
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
  // Same rail elevation and tooth language on all flat-top uppers.
  b('receiver',-1.5,2.28,0,8.3,.78,2.65,1);
  addARRailSegments(root,'receiver',parts.receiver,index.receiver++,
   {startX:-5.3,endX:2.3,count:3,topY:2.84},material[0]);
 }

 // A single textured side mark replaces tiny modeled receiver hardware.
 // Receiver-side mark is taller, directly OVER the magazine insertion.
 addWeaponPixelMark(root,'ar-port',m.portX,m.portY,1.82,
  m.portWidthX,m.portHeightY);
 // R4.6: the charging handle is a substantial, seated rear shelf.
 b('receiver',-5.92,1.59,0,1.68,.80,3.90,0);
 // A single square-ended raised oblique FACE. R4.6's rotated cuboid partly
 // intersected the body and rasterized as dotted fragments. This flat
 // four-point wedge is deliberately offset beyond the receiver's side face.
 // Front (+X) stays immediately behind the ejection-port rear edge.
 const assist=addOutline(root,'receiver',parts.receiver,index.receiver++,
  [[-3.16,.86],[-.77,.30],[-.86,-.12],[-3.25,.44]],.27,material[1]);
 assist.position.z=1.91;
 assist.userData.arForwardAssist=true;

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
    [rear+2.0,-4.17],[rear+.30,-4.17],[rear,-3.82]]:
   // Early sliding Fiberlite shape is simpler and visually lighter.
   // Retro CAR: single thick shape; the lower diagonal reads as a shadow.
   [[rear,.72],[front,.67],[front,-1.24],
    [rear+1.35,-2.40],[rear,-1.98]],
   compact?3.35:m4?3.25:3.0,compact?2:1);
  if(!compact&&!m4)
   // One thick flat Fiberlite buttpad, same on CAR-15 and Colt 733.
   b('stock',rear+.06,-.62,0,.25,2.56,3.04,0);
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
  // One quiet molded lower bevel on EACH side, not a square applied panel.
  const polyFacet=arMagazinePolyLowerFacet(curve);
  for(const side of [-1,1]){
   const bevel=addOutline(root,'magazine',mag,index.magazine++,
    polyFacet,.13,material[0]);
   bevel.position.z=side*(m.magazineDepthZ/2+.05);
   bevel.castShadow=false;bevel.receiveShadow=false;
  }
  // The substantial tan lower plate remains tangent to the curved toe.
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
 const isFreefloat=guard==='ar-risii'||guard==='ar-compact-rail';
 if(guard!=='ar-pri-tube'){
  if(isFreefloat)
   // Broad squared mounting collar, NOT a spring delta ring on RIS II.
   gh([[start-.51,1.55],[start+.52,1.48],
    [start+.52,-1.55],[start-.51,-1.65]],4.10,0);
  else
   // Slightly lowered and enlarged conventional delta-ring trapezoid.
   gh([[start-.48,1.55],[start+.63,1.39],
    [start+.63,-1.65],[start-.48,-1.76]],4.12,0);
 }
 if(guard==='ar-pri-tube'){
  const tube=addFacetedTube(root,'handguard',parts.handguard,index.handguard++,
   start,end,1.82,material[1]);
  tube.position.y=AR_VISUAL_AXIS_Y;
  gb(start+.35,0,0,.70,3.25,3.75,0);
  // Mk12 Mod 0 keeps the six-sided PRI tube and its continuous bridge.
  gb((start+end)/2,2.06,0,end-start,.56,2.8,0);
  gb(2.65,2.06,0,3.85,.52,2.6,0);
  // The Mk12's long continuous A.R.M.S.-style bridge finally has a handful
  // of strong teeth; do not turn the PRI tube into a quad-rail.
  addARRailSegments(root,'handguard',parts.handguard,index.handguard++,
   {startX:start+.48,endX:end-.30,count:5,topY:2.87},material[0]);
  gm('pri-vents',(start+end)/2,.27,1.90,end-start-1.7,.77);
 }else if(guard==='ar-triangle'){
  // Two deliberately angled facets instead of a featureless slab.
  gh([[start,1.47],[start+.64,1.75],
   [end-1.05,1.08],[end,.60],[end,-.88],
   [end-1.05,-1.15],[start,-1.72]],3.62,1);
  gh([[start,-.73],[end-.82,-.68],[end-1.05,-1.15],
   [start,-1.72]],3.75,0);
  // Broad dark upper vents only; no tiny front-face pinholes.
  gm('a1-vents',(start+end)/2,1.08,1.94,end-start-1.55,1.14);
 }else if(guard==='ar-round'||guard==='ar-carbine'||retro){
  gh(retro?
   [[start,1.26],[start+.88,1.48],[end-.5,1.45],
    [end,-.75],[end-.55,-1.46],[start+.35,-1.53]]:
   [[start,1.42],[start+.75,1.77],[end-.75,1.69],
    [end,-.78],[end-.65,-1.71],[start+.45,-1.76]],
   retro?3.15:3.85,1);
  if(retro)gb(start+.32,.04,0,.53,2.88,3.32,0);
  // No horizontal highlight seam. Dark transverse ribbing should stand on
  // its own as polymer texture rather than create a glowing crosshatch.
  gm(retro?'car-ribs':'poly-ribs',(start+end)/2,.10,
   retro?1.68:2.03,end-start-1.8,2.24);
 }else{
  const ris=guard==='ar-risii';
  const covered=guard==='ar-compact-rail';
  const span=end-start,center=(start+end)/2;
  // Stepped cross-section of authentic quad furniture.
  gh(ris?
   [[start,-1.50],[start,1.28],[start+.45,1.51],
    [end-.70,1.51],[end,.66],[end,-1.16],[end-.63,-1.58]]:
   [[start,-1.55],[start,1.49],
    [end-.60,1.49],[end,.90],[end,-1.48]],
   ris?3.72:3.17,ris?2:1);
  // Underlying rail spines — continuous, but the teeth are one instanced mesh.
  gb(center,1.87,0,span,.62,3.16,0);
  gb(center,-1.83,0,span-.70,.48,2.43,0);
  // Bury the side spine just inside the outer teeth, leaving tangible
  // negative-space steps without inflating the entire handguard silhouette.
  for(const side of [-1,1])
   gb(center,.07,side*2.01,span-1.2,.53,.31,0);
  addARRailSegments(root,'handguard',parts.handguard,index.handguard++,
   {startX:start,endX:end,count:guard==='ar-m5-rail'?5:4,
    topY:2.84,bottomY:-1.65,sideZ:2.44,sideY:.59,
    coverSides:covered},material[0]);
  // A single understated front cap makes the rail read as an attached
  // fore-end rather than a row of free-floating toy blocks.
  gb(end-.13,.04,0,.27,2.80,ris?3.35:3.15,0);
  if(covered){
   // Cover occupies its own rail section; no side teeth underneath.
   for(const side of [-1,1])gb(center,.10,side*2.39,
    span-1.95,1.07,.28,1);
   gm('rail-cover-stripes',center,.62,2.56,span-2.1,.84);
  }
 }

 // The barrel is the only authority for its own muzzle and front-sight X.
 // A short retro barrel can have a fixed A-frame; the handguard is irrelevant.
 const tip=barrelArt.muzzleX,sight=barrelArt.sightX;
 const barrelStart=Math.min(end-.7,(sight??tip)-1.35);
 b('barrel',(barrelStart+tip)/2,AR_VISUAL_AXIS_Y,0,tip-barrelStart,
  barrelArt.barrelHeight,barrelArt.barrelDepth,0);
 if(sight!==null&&(barrelArt.sight==='a1'||barrelArt.sight==='a2')){
  // Tall bold A-frame: a perfectly vertical FRONT face and a 56-degree
  // diagonal rear face. The guard roof is NOT the actual sighting datum.
  frame('barrel',[[sight-2.45,.70],[sight+1.02,.70],
    [sight+1.02,4.10],[sight-.18,4.10]],
   [[sight-1.18,1.27],[sight-.03,3.27],
    [sight+.54,3.27],[sight+.54,1.27]],1.50);
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
 // Factory silhouette is hidden when an external muzzle device REPLACES it.
 // Shot/mount X is still the existing configured authoritative tip.
 if(showFactoryMuzzle){
  const birdcage=(length:number,height:number,depth:number)=>{
   b('barrel',tip-length/2,AR_VISUAL_AXIS_Y,0,length,height,depth,0);
   // Two deliberately long slots parallel to the bore, never vertical dots.
   addWeaponPixelMarkPair(root,'ar-birdcage',tip-length/2,AR_VISUAL_AXIS_Y,
    depth/2+.085,length*.77,height*.72);
  };
  if(barrelArt.profile==='spr'){
   // Mk12 Mod 0 specialist brake/collar, not a universal birdcage.
   b('barrel',tip-1.34,AR_VISUAL_AXIS_Y,0,.66,1.91,1.94,1);
   b('barrel',tip-.46,AR_VISUAL_AXIS_Y,0,.90,1.73,1.82,1);
  }else if(barrelArt.profile==='cqb'){
   // Keep 10.3-inch Mk18's tiny but visible exposed nose OUT of RIS II.
   birdcage(1.30,1.95,2.02);
   b('barrel',tip-1.22,AR_VISUAL_AXIS_Y,0,.20,2.08,2.08,1);
  }else if(parts.barrel==='ar-145'){
   birdcage(2.04,1.44,1.57);
  }else if(parts.barrel==='ar-20'){
   // Lighter pencil-barrel era A1 hider.
   birdcage(1.94,1.40,1.56);
  }else if(parts.barrel==='ar-733-115'){
   birdcage(1.78,1.69,1.80);
  }else{
   // Shared enlarged A2-family USGI hider.
   birdcage(2.30,1.83,1.91);
   b('barrel',tip-2.17,AR_VISUAL_AXIS_Y,0,.26,1.95,1.96,1);
  }
 }

}
