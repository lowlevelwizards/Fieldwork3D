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
  [[-5.5,-1.25],[-5.45,1.05],[-4.9,1.15],[3.45,1.1],
   [3.7,-1.05],[-3.05,-2.05]]:
  [[-6.55,-1.25],[-6.45,1.05],[-5.45,1.15],[3.9,1.1],
   [4.15,-1.05],[-3.15,-2.05]],3.85,0);
 p('receiver',compact?
  [[-5.2,1.1],[-4.65,2.35],[1.3,2.4],[2.7,1.75],[2.9,1.05]]:
  [[-5.8,1.1],[-5.2,2.25],[1.6,2.3],[3.0,1.8],[3.25,1.05]],
  3.5,1);
 b('receiver',-4.25,-.05,2.05,2.8,1.15,.5,1);
 // A short angled seating region, not an AR-style external magwell.
 const m=AK_VISUAL_ANATOMY;
 p('receiver',[[m.magwellCenterX-1.75,m.magwellTopY],
   [m.magwellCenterX+1.70,m.magwellTopY],
   [m.magwellCenterX+1.50,m.magwellBottomY],
   [m.magwellCenterX-1.30,m.magwellBottomY]],3.25,0);
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
  p('receiver',[[2.45,2.12],[2.7,2.92],[3.14,3.04],
   [3.72,2.98],[4.06,2.32],[4.22,2.12]],2.0,0);
 }

 // Two small exterior clues: a selector toward the rear and an ejection
 // mark above the magazine. Never confuse these with gameplay anatomy.
 addWeaponPixelMark(root,'ak-selector',-1.9,.45,1.98,2.35,1.05);
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
  p('stock',[[-15.85,.7],[-10.6,.8],[-6.15,-.42],
   [-6.3,-1.25],[-10.4,-2.02],[-11.25,-3.6],
   [-13.4,-4.15],[-15.85,-3.7]],3.35,2);
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
  // New true two-SIDED underfolder: two distinct rails on opposite Z sides,
  // a lowered rear hinge and slender bridging butt plate.
  for(const side of [-1,1]){
   const z=side*.73;
   const top=line('stock',[-6.10,-.33],[-14.38,-.24],
    .68,.82,0);top.position.z=z;
   const lower=line('stock',[-6.12,-1.44],[-14.36,-2.00],
    .66,.82,0);lower.position.z=z;
  }
  b('stock',-14.62,-1.06,0,.86,3.25,2.52,0);
  b('stock',-6.08,-.97,0,1.15,1.98,2.50,0);
 }else if(stock==='ak-sidefold'||stock==='ak-sidefold-plum'){
  // Reuse the strongest AK-74M polymer cheek/heel profile across 100-series.
  p('stock',[[-14.4,.78],[-9.1,.93],[-6.12,.28],
   [-6.32,-1.42],[-9.75,-2.85],[-14.4,-2.30]],3.35,1);
  b('stock',-6.29,-.20,0,.68,1.85,2.70,0);
 }else{
  const isWood=stock.startsWith('ak-wood')&&
   !stock.endsWith('-plum');
  // Classic AK fixed stock: horizontal comb, stepped wrist and full butt.
  p('stock',[[-15.35,.68],[-10.25,.78],[-6.12,-.48],
   [-6.4,-1.18],[-11.5,-3.18],[-15.35,-2.92]],3.35,isWood?2:1);
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
   [[start,-1.48],[start+.65,1.05],[end-.75,1.15],
    [end,.04],[end-.9,-2.13],[start+.9,-2.13]]:
   woodGuard?
   [[start,-1.35],[start+.7,1.02],[end-.9,1.1],
    [end,-.1],[end-.85,-1.84],[start+1.0,-1.84]]:
   [[start,-1.35],[start+.75,1.05],[end-.7,1.05],
    [end,-.2],[end-.5,-1.75],[start+.45,-1.75]],3.85,
   woodGuard?2:1);
 // Two clean lengths of furniture; the receiver encloses the rear joint.
 // The former tall metal collar created a floating grey slab and is REMOVED.
 // Keep the thin horizontal opening between upper and lower wood/polymer.
 p('handguard',[[start,1.33],[start+.65,2.28],
   [end-1.35,2.25],[end-.6,1.33]],2.9,woodGuard?2:1);
 if(rail)b('handguard',(start+.9+end)/2,2.6,0,
  end-start-1.2,.6,3.0,0);

 // The front end is authored by barrel ID, not by receiver or a randomly
 // selected compatible furniture finish. All metal joints stay contiguous.
 const tip=art.muzzleX,front=art.handguardFrontX;
 const gas=art.gasBlockX,sight=art.frontSightX;
 const metalDepth=rpk?1.86:1.48;
 b('barrel',(front-.24+tip)/2,0,0,tip-front+.24,
  rpk?1.42:1.12,metalDepth,0);
 // Exposed upper gas-tube silhouette: one strong parallel line above barrel.
 const tubeBegin=Math.max(front-.45,art.gasTubeBeginX);
 const tubeEnd=gas+.20;
 if(tubeEnd>tubeBegin)
  b('barrel',(tubeBegin+tubeEnd)/2,1.07,0,
   tubeEnd-tubeBegin,.66,1.45,0);
 // The gas block connects upper tube DOWN into the main barrel.
 // On the RPK the real gas system is still above, and the extra visible
 // underside is a barrel/bipod support rather than a false reversed gas tube.
 p('barrel',[[gas-.54,.52],[gas-.46,1.98],
  [gas+.20,2.08],[gas+.57,1.35],[gas+.57,-.52],
  [gas-.41,-.52]],1.88,0);
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
   b('barrel',18.55,-.78,0,4.7,.38,1.35,0);
   line('barrel',[17.1,-.65],[20.25,-1.82],.51,1.17,0);
   b('barrel',20.37,-1.75,0,.66,.42,1.37,1);
  }else if(art.muzzleStyle==='carbine'){
   // Short stout 100-series carbine hider, not an unchanged rifle brake.
   p('barrel',[[tip-1.45,-.98],[tip-.22,-1.09],
    [tip,-.79],[tip,.77],[tip-.22,1.05],
    [tip-1.45,1.00]],2.32,1);
   b('barrel',tip-1.36,0,0,.28,2.20,2.40,0);
  }else if(parts.receiver==='akm'||parts.receiver==='ak103'){
   // Oversized game-art slant: a major diagonal TERMINAL face.
   // AK-103 slant is intentionally a non-factory custom appearance.
   p('barrel',[[tip-1.75,-.68],[tip-.55,-.78],
    [tip,.05],[tip-.35,1.14],
    [tip-1.75,.94]],2.20,1);
  }else{
   // 20% longer AK-74-family cylindrical compensator.
   p('barrel',[[tip-2.83,-1.08],[tip-.20,-1.08],
    [tip,-.84],[tip,.86],[tip-.22,1.07],
    [tip-2.83,1.07]],2.40,1);
   b('barrel',tip-2.71,0,0,.29,2.30,2.51,0);
  }
 }
}
