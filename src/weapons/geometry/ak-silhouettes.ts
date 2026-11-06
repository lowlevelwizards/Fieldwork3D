/** Stylized AK-family exterior language. Big shapes and negative space,
 * not miniature mechanical hardware. Game-only muzzle/contact remain elsewhere.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';
import {AK_WARM_RESIN,AK_WOOD_AMBER,AK_WOOD_RED,
 AK_PLUM_POLYMER,AK_MAG_RIB} from './weapon-visual-palette.ts';
import {AK_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';
import {akMagazineCurve,akMagazineOutline,akMagazineRibOutlines}
 from './ak-magazine-profiles.ts';
import {akBarrelArt,AK_BARREL_ART} from './ak-barrel-profiles.ts';

export function addAKFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material){
 const parts=build.parts,material=[steel,dark,wood] as const;
 const index:Record<SlotName,number>={stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0};
 // Finish changes never change geometry, ammunition, sockets, or gameplay.
 // Part IDs already persist through the established equipment editor.
 const partMaterial=(slot:SlotName,finish:0|1|2)=>{
  const id=parts[slot];
  if(id.endsWith('-amber'))return AK_WOOD_AMBER;
  if(id.endsWith('-red'))return AK_WOOD_RED;
  if(id.endsWith('-plum')||id.startsWith('ak-poly-plum-'))
   return AK_PLUM_POLYMER;
  if(id==='ak-grip-bakelite'||id==='ak-mag545'||
   id==='ak-rpk-mag45'||id==='ak-mag762-resin')return AK_WARM_RESIN;
  return material[finish];
 };
 const p=(slot:SlotName,outline:Outline,depth:number,finish:0|1|2=1)=>
  addOutline(root,slot,parts[slot],index[slot]++,outline,depth,
   partMaterial(slot,finish));
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:0|1|2=1)=>addCuboid(root,slot,parts[slot],index[slot]++,
   x,y,z,w,h,d,material[finish]);
 const line=(slot:SlotName,start:readonly [number,number],end:readonly [number,number],
  width:number,depth:number,finish:0|1|2=1)=>
  addBar(root,slot,parts[slot],index[slot]++,start,end,width,depth,material[finish]);

 const compact=parts.receiver==='akcompact';
 const rpk=parts.receiver==='ak-rpk74';
 // Sloping stamped-look receiver and stepped roof. Core shared when authentic.
 p('receiver',compact?
  [[-5.5,-2.05],[-5.45,1.05],[-4.9,1.15],[3.45,1.1],
   [3.7,-2.05]]:
  [[-6.55,-2.05],[-6.45,1.05],[-5.45,1.15],[3.9,1.1],
   [4.15,-2.05]],3.85,0);
 p('receiver',compact?
  [[-5.45,1.1],[-4.93,2.37],[1.45,2.4],[3.36,1.92],[4.25,1.10]]:
  [[-6.32,1.1],[-5.62,2.34],[1.95,2.38],[3.45,2.17],
   [4.93,1.53],[5.10,1.12]],
  3.5,1);
 b('receiver',-4.25,-.05,2.05,2.8,1.15,.5,1);
 // A short angled seating region, not an AR-style external magwell.
 const m=AK_VISUAL_ANATOMY;
 p('receiver',[[m.magwellCenterX-1.75,m.magwellTopY],
   [m.magwellCenterX+1.70,m.magwellTopY],
   [m.magwellCenterX+1.50,m.magwellBottomY],
   [m.magwellCenterX-1.30,m.magwellBottomY]],3.25,0);
 // The short front trunnion cheek meets the shallower lower furniture
 // without resurrecting the previous tall, free-standing metal spacer.
 p('receiver',[[3.25,-1.06],[4.13,-1.06],
  [4.14,-2.05],[3.25,-2.05]],3.55,0);
 if(compact){
  // AKS-74U hinged dust cover with a LOW, squat rear-sight hump.
  // Avoid the previous tall, flat slab that read as a holographic optic.
  p('receiver',[[-5.12,2.2],[-4.56,2.68],[-1.42,2.77],
   [-.7,2.28]],2.25,1);
  p('receiver',[[-4.53,2.64],[-4.24,3.19],[-3.42,3.19],
   [-3.18,2.72]],1.45,0);
 }else{
  // True AK sight block belongs at the FORWARD edge of the dust cover.
  // An intentionally low stepped outline, not a rear-mounted holo-looking box.
  // The rear sight rests on the forward cover termination and the
  // lower saddle overlaps the upper handguard's rear quarter.
  p('receiver',[[2.94,2.17],[3.16,2.93],[3.58,3.10],
   [4.10,3.04],[4.45,2.37],[4.76,2.17]],2.0,0);
 }

 // Two small exterior clues: a selector toward the rear and an ejection
 // mark above the magazine. Never confuse these with gameplay anatomy.
 addWeaponPixelMark(root,'ak-selector',-.97,-.39,1.98,2.95,.96);
 // Classic stamped covers carry coarse ribs. 74M/100-series smooth
 // covers and the hinged 74U cover deliberately stay clean.
 if(parts.receiver==='akm'||parts.receiver==='ak74'||rpk)
  addWeaponPixelMark(root,'ak-cover-ribs',-2.05,1.91,1.92,4.2,.80);
 addWeaponPixelMark(root,'ak-port',m.portX,m.portY,1.98,
  m.portWidthX,m.portHeightY);

 // Stock types are visually disparate; the skeletal type MUST stay hollow.
 const stock=parts.stock;
 if(stock==='ak-skeleton'){
  // Preserve the successful open profile, only thicken the connecting bars.
  // Preserve the 74U's successful open skeleton; only extend its rear frame.
  line('stock',[-5.25,.65],[-13.0,.55],1.0,1.05,0);
  line('stock',[-5.25,-1.35],[-13.0,-2.5],1.0,1.05,0);
  line('stock',[-5.25,-1.3],[-9.45,.15],.75,1.05,0);
  b('stock',-13.5,-1,0,1.05,3.65,2.5,1);
 }else if(stock.startsWith('ak-rpk-clubfoot')){
  // RPK-specific broad butt, tucked wrist, and exaggerated low clubfoot heel.
  // The comb joins the receiver at the LOWER-receiver roof, not halfway
  // down its wall. Retain the deep clubfoot behind the narrower stock neck.
  p('stock',[[-15.85,.72],[-10.6,.86],[-8.1,1.01],[-6.22,1.01],
   [-6.38,-1.50],[-10.4,-2.06],[-11.32,-3.65],
   [-13.4,-4.15],[-15.85,-3.70]],3.35,2);
 }else if(stock==='ak-triangle-full'){
  // Standard AKS-74 side-folding TRIANGLE: strong top rail, single lower
  // diagonal, open center, clean skinny butt. It must not read as an AKMS.
  line('stock',[-5.90,.62],[-14.15,.52],.89,1.18,0);
  line('stock',[-5.90,.55],[-14.12,-2.58],.90,1.16,0);
  b('stock',-14.48,-1.07,0,.86,3.64,2.10,1);
  b('stock',-5.90,-.15,0,.88,2.18,1.95,0);
 }else if(stock==='ak-triangle-padded'){
  // Preserve the prior braced AKS-74 art as a separate custom padded option.
  line('stock',[-5.42,.62],[-14.1,.62],.92,1.15,0);
  line('stock',[-5.42,.58],[-14.1,-2.65],.88,1.1,0);
  line('stock',[-5.48,-1.15],[-9.0,-.72],.66,1.05,0);
  b('stock',-14.58,-1.05,0,1.25,3.90,2.60,1);
 }else if(stock==='ak-underfolder'){
  // AKMS underfolder in side orthographic: ONE nearly straight rod per
  // receiver side, sloped slightly downward, with a hanging rear buttplate.
  // The pair is separated along Z, not diagonally in XY like a triangle.
  for(const side of [-1,1]){
   const rod=line('stock',[-6.18,-1.00],[-14.31,-1.81],
    .83,.80,0);
   rod.position.z=side*1.04;
   const geo=new THREE.CylinderGeometry(.73,.73,.42,8,1);
   geo.rotateX(Math.PI/2);
   const rivet=new THREE.Mesh(geo,material[0]);
   rivet.name='family-stock-'+stock+'-'+index.stock++;
   rivet.position.set(-6.18,-1.04,side*1.56);
   rivet.castShadow=true;rivet.receiveShadow=true;root.add(rivet);
  }
  // Tall vertical rear plate, upper lip and lower transverse connector.
  b('stock',-14.57,-1.49,0,.86,3.80,2.65,0);
  b('stock',-14.52,-2.99,0,.85,.48,3.30,0);
 }else if(stock==='ak-sidefold'||stock==='ak-sidefold-plum'){
  // Reuse the strongest AK-74M polymer cheek/heel profile across 100-series.
  p('stock',[[-14.4,.78],[-9.1,.93],[-6.12,.28],
   [-6.32,-1.42],[-9.75,-2.85],[-14.4,-2.30]],3.35,1);
  b('stock',-6.29,-.20,0,.68,1.85,2.70,0);
 }else{
  const isWood=stock.startsWith('ak-wood')&&
   !stock.endsWith('-plum');
  if(parts.receiver==='akm'){
   // Two clear quads: a receiver-height 24-degree descending neck and
   // a larger broad rear butt. No narrow pointed wedge at the junction.
   p('stock',[[-6.42,.92],[-10.10,-.56],
    [-10.25,-3.37],[-6.42,-2.04]],3.35,isWood?2:1);
   p('stock',[[-10.08,-.58],[-15.45,-.36],
    [-15.45,-3.83],[-12.65,-3.63],
    [-10.19,-3.25]],3.35,isWood?2:1);
  }else{
   // Fixed 74-pattern stock keeps its lighter, shallower upper comb.
   p('stock',[[-15.35,.68],[-10.25,.78],[-6.12,-.48],
    [-6.4,-1.18],[-11.5,-3.18],[-15.35,-2.92]],3.35,isWood?2:1);
  }
  if(stock.startsWith('ak-wood74'))
   b('stock',-10.7,-1,1.97,2.0,.65,.18,1);
 }

 // Grips are deliberately raked, with one body prism and no modeled stippling.
 const grip=parts.grip,gripWood=grip.startsWith('ak-grip-wood'),
 resin=grip==='ak-grip-bakelite';
 // Rake remains distinct from the AR, but its slimmer root sits at the rear.
 p('grip',shiftProfile([[-3.35,-1.65],[-.8,-1.65],[-1.1,-5.65],
  [-2.25,-6.1],[-3.55,-5.7]],m.gripShiftX),
  m.gripDepthZ,gripWood||resin?2:1);

 // The 3D sides narrow along Z; their side-view curve remains broad.
 // Keep the characteristic 7.62 lower swing larger than the 5.45 curve.
 const mag=parts.magazine,heavy=mag.startsWith('ak-mag762');
 const extended=mag.startsWith('ak-rpk-mag45');
 const resinMag=mag==='ak-mag545'||mag==='ak-mag762-resin';
 const finish:0|1|2=resinMag||extended?2:heavy&&mag==='ak-mag762'?0:1;
 const style=heavy?'762':extended?'rpk45':'545';
 const curve=akMagazineCurve(style,m.magwellCenterX,m.magazineTopY,
  m.magazineWidthX,m.magazineDepthZ);
 p('magazine',akMagazineOutline(curve),m.magazineDepthZ,finish);
 for(const outline of akMagazineRibOutlines(curve)){
  // Two contour-following embossed strokes, no cast shadows or thin z-noise.
  const rib=addOutline(root,'magazine',mag,index.magazine++,
   outline,m.magazineDepthZ+.08,AK_MAG_RIB);
  rib.castShadow=false;rib.receiveShadow=false;
 }

 const guard=parts.handguard;
 // On full rifles the fore-end stops well before the forward sight/gas tube.
 const art=akBarrelArt(parts.barrel)??AK_BARREL_ART['ak-long'];
 const end=art.handguardFrontX;
 // Seat the lower and upper furniture 0.55+ units INSIDE the receiver front.
 const start=compact?3.05:3.50;
 const woodGuard=guard.startsWith('ak-wood-long')||
  guard.startsWith('ak-wood-short')||guard.startsWith('ak-rpk-wood');
 const rail=guard==='ak-rail-long';
 // Distinct lower cheek on wooden rifles, straightforward block on polymers.
 p('handguard',rpk?
   [[start,-1.35],[start+.65,.96],[end-.75,1.01],
    [end,-.12],[end-.9,-1.79],[start+.9,-1.79]]:
   woodGuard?
   [[start,-1.27],[start+.7,.97],[end-.9,1.01],
    [end,-.18],[end-.85,-1.59],[start+1.0,-1.59]]:
   [[start,-1.29],[start+.75,.97],[end-.7,.99],
    [end,-.22],[end-.5,-1.57],[start+.45,-1.57]],3.85,
   woodGuard?2:1);
 // Two clean lengths of furniture; the receiver encloses the rear joint.
 // The former tall metal collar created a floating grey slab and is REMOVED.
 // Keep the thin horizontal opening between upper and lower wood/polymer.
 // Taller, shorter upper half with a deliberate narrow horizontal seam.
 // The front of the cover terminates into its rear third; no vertical slab.
 const upperRear=compact?start+1.0:start+1.08;
 p('handguard',[[upperRear,1.33],[upperRear+.78,2.59],
   [end-1.2,2.55],[end-.6,1.33]],2.9,woodGuard?2:1);
 if(rail)b('handguard',(upperRear+.9+end)/2,2.88,0,
  end-upperRear-1.2,.48,3.0,0);

 // The front end is authored by barrel ID, not by receiver or a randomly
 // selected compatible furniture finish. All metal joints stay contiguous.
 const tip=art.muzzleX,front=art.handguardFrontX;
 const gas=art.gasBlockX;
 // The slant compensator begins farther forward than the long 5.45 brake;
 // position its single sight tower flush against the custom slant body.
 const sight=(parts.receiver==='akm'||parts.receiver==='ak103')?
  tip-2.48:art.frontSightX;
 const metalDepth=rpk?1.86:1.48;
 b('barrel',(front-.24+tip)/2,0,0,tip-front+.24,
  rpk?1.42:1.12,metalDepth,0);
 // Exposed upper gas-tube silhouette: one strong parallel line above barrel.
 const tubeBegin=Math.max(front-1.02,art.gasTubeBeginX-1.02);
 const tubeEnd=gas+.10;
 if(tubeEnd>tubeBegin)
  b('barrel',(tubeBegin+tubeEnd)/2,1.50,0,
   tubeEnd-tubeBegin,.92,1.46,0);
 // One thick oblique descending GAS BLOCK (not a second tall sight).
 // Start above the barrel from the upper handguard's middle height and
 // run downward to connect with the single horizontal main barrel.
 p('barrel',[[gas-.78,1.14],[gas+.02,1.99],
  [gas+.48,1.55],[gas+1.04,.35],[gas+.71,-.53],
  [gas+.11,-.53],[gas-.37,.85]],1.82,0);
 if(art.muzzleStyle==='booster'){
  // Compact AKS-74U front tower and conspicuous squat muzzle booster.
  p('barrel',[[sight-.47,.34],[sight-.25,2.69],
   [sight+.35,2.82],[sight+.63,.28]],1.76,0);
  p('barrel',[[tip-1.48,-.91],[tip-.32,-1.20],[tip,-1.03],
   [tip,1.04],[tip-.34,1.25],[tip-1.48,.93]],2.8,1);
 }else{
  // One thick sight tower near the correct length-specific muzzle region.
  p('barrel',[[sight-.50,.38],[sight-.30,2.73],
   [sight+.50,2.94],[sight+.72,.38]],1.84,0);
  if(rpk){
   // RPK's unusually long exposed nose and iconic folded bipod silhouette.
   // The gas block above stays anatomically recognizable.
   p('barrel',[[tip-1.00,-.56],[tip,-.56],
    [tip,.56],[tip-1.00,.56]],1.60,1);
   // One chunky, straight, folded bipod bar PARALLEL under the long barrel,
   // attached near its front and continuing to the lower furniture lip.
   const rearBipod=front+.42,frontBipod=tip-2.32;
   b('barrel',(rearBipod+frontBipod)/2,-1.13,0,
    frontBipod-rearBipod,.85,1.48,0);
   b('barrel',frontBipod,-.95,0,.72,1.43,1.70,0);
   b('barrel',rearBipod,-.95,0,.62,1.35,1.58,1);
  }else if(art.muzzleStyle==='carbine'){
   // Short stout 100-series carbine hider, not an unchanged rifle brake.
   p('barrel',[[tip-1.45,-.98],[tip-.22,-1.09],
    [tip,-.79],[tip,.77],[tip-.22,1.05],
    [tip-1.45,1.00]],2.32,1);
   b('barrel',tip-1.36,0,0,.28,2.20,2.40,0);
  }else if(parts.receiver==='akm'||parts.receiver==='ak103'){
   // Oversized game-art slant: a major diagonal TERMINAL face.
   // AK-103 slant is intentionally a non-factory custom appearance.
   p('barrel',[[tip-1.80,-.76],[tip,-.76],
    [tip-1.18,1.16],[tip-1.80,1.03]],2.28,1);
  }else{
   // 20% longer AK-74-family cylindrical compensator.
   p('barrel',[[tip-2.83,-1.08],[tip-.20,-1.08],
    [tip,-.84],[tip,.86],[tip-.22,1.07],
    [tip-2.83,1.07]],2.40,1);
   b('barrel',tip-2.71,0,0,.29,2.30,2.51,0);
  }
 }
}
