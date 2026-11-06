/** Stylized AK-family exterior language. Big shapes and negative space,
 * not miniature mechanical hardware. Game-only muzzle/contact remain elsewhere.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';
import {AK_WARM_RESIN} from './weapon-visual-palette.ts';
import {AK_VISUAL_ANATOMY,shiftProfile}
 from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';

export function addAKFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material){
 const parts=build.parts,material=[steel,dark,wood] as const;
 const index:Record<SlotName,number>={stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0};
 const p=(slot:SlotName,outline:Outline,depth:number,finish:0|1|2=1)=>
  addOutline(root,slot,parts[slot],index[slot]++,outline,depth,
   finish===2&&(parts[slot]==='ak-grip-bakelite'||parts[slot]==='ak-mag545'||parts[slot]==='ak-rpk-mag45')?
    AK_WARM_RESIN:material[finish]);
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
  b('receiver',-3.9,2.52,0,1.15,.58,2.0,0);
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
 }else if(stock==='ak-rpk-clubfoot'){
  // RPK-specific broad butt, tucked wrist, and exaggerated low clubfoot heel.
  p('stock',[[-15.85,.7],[-10.6,.8],[-6.15,-.42],
   [-6.3,-1.25],[-10.4,-2.02],[-11.25,-3.6],
   [-13.4,-4.15],[-15.85,-3.7]],3.35,2);
 }else if(stock==='ak-triangle-full'){
  // AKS-74: an unmistakable open SIDE-folding triangle, never AKMS rails.
  line('stock',[-5.42,.62],[-14.1,.62],.92,1.15,0);
  line('stock',[-5.42,.58],[-14.1,-2.65],.88,1.1,0);
  line('stock',[-5.48,-1.15],[-9.0,-.72],.66,1.05,0);
  b('stock',-14.46,-1.05,0,.9,3.62,2.18,1);
 }else if(stock==='ak-underfolder'){
  // AKMS: the top strut stays almost level; the lower fork drops rearward.
  // The skinny turned buttplate reads differently from the AKS-74 triangle.
  line('stock',[-5.55,.48],[-14.12,.35],.65,1.1,0);
  line('stock',[-5.58,-1.15],[-13.96,-2.16],.66,1.1,0);
  b('stock',-14.4,-.95,0,.72,3.24,1.65,0);
  b('stock',-5.72,-.28,0,1.05,2.0,1.6,1);
 }else if(stock==='ak-sidefold'){
  // Reuse the strongest AK-74M polymer cheek/heel profile across 100-series.
  p('stock',[[-14.4,.78],[-9.1,.93],[-6.12,.28],
   [-6.32,-1.42],[-9.75,-2.85],[-14.4,-2.30]],3.35,1);
 }else{
  const isWood=stock==='ak-wood'||stock==='ak-wood74';
  // Classic AK fixed stock: horizontal comb, stepped wrist and full butt.
  p('stock',[[-15.35,.68],[-10.25,.78],[-6.12,-.48],
   [-6.4,-1.18],[-11.5,-3.18],[-15.35,-2.92]],3.35,isWood?2:1);
  if(stock==='ak-wood74')
   b('stock',-10.7,-1,1.97,2.0,.65,.18,1);
 }

 // Grips are deliberately raked, with one body prism and no modeled stippling.
 const grip=parts.grip,gripWood=grip==='ak-grip-wood',
 resin=grip==='ak-grip-bakelite';
 // Rake remains distinct from the AR, but its slimmer root sits at the rear.
 p('grip',shiftProfile([[-3.35,-1.65],[-.8,-1.65],[-1.1,-5.65],
  [-2.25,-6.1],[-3.55,-5.7]],m.gripShiftX),
  m.gripDepthZ,gripWood||resin?2:1);

 // The 3D sides narrow along Z; their side-view curve remains broad.
 // Keep the characteristic 7.62 lower swing larger than the 5.45 curve.
 const mag=parts.magazine,heavy=mag==='ak-mag762'||mag==='ak-mag762poly';
 const resinMag=mag==='ak-mag545';
 const extended=mag==='ak-rpk-mag45';
 const finish:0|1|2=resinMag||extended?2:heavy&&mag==='ak-mag762'?0:1;
 const top=m.magazineTopY;
 const magLeft=m.magwellCenterX-m.magazineWidthX/2;
 const magRight=m.magwellCenterX+m.magazineWidthX/2;
 if(extended)
  p('magazine',[[magLeft,top],[magRight,top],
   [magRight+.28,-5.2],[magRight+1.72,-8.55],
   [magLeft+1.15,-9.45],[magLeft+.32,-5.25]],
   m.magazineDepthZ,finish);
 else if(heavy)
  p('magazine',[[magLeft,top],[magRight,top],
   [magRight+.42,-4.35],[magRight+2.84,-7.05],
   [magLeft+2.1,-8.15],[magLeft+.55,-5.05]],
   m.magazineDepthZ,finish);
 else
  p('magazine',[[magLeft,top],[magRight,top],
   [magRight+.2,-4.6],[magRight+1.56,-6.88],
   [magLeft+1.18,-7.76],[magLeft+.36,-4.95]],
   m.magazineDepthZ,finish);

 const guard=parts.handguard;
 const short=guard==='ak-wood-short'||guard==='ak-poly-short';
 const mid=guard==='ak-poly-mid';
 // On full rifles the fore-end stops well before the forward sight/gas tube.
 const end=short?11.45:mid?12.3:rpk?13.35:12.45;
 const start=short?3.55:4.0;
 const woodGuard=guard==='ak-wood-long'||guard==='ak-wood-short'||guard==='ak-rpk-wood';
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
 // Restore a deliberate narrow gap between upper and lower furniture.
 // A chunky rear collar keeps the two silhouettes visually connected.
 p('handguard',[[start+.8,1.3],[start+1.7,2.4],
   [end-1.35,2.25],[end-.6,1.3]],2.9,woodGuard?2:1);
 b('handguard',start+.72,.42,0,.58,3.5,3.88,0);
 if(rail)b('handguard',(start+.9+end)/2,2.6,0,
  end-start-1.2,.6,3.0,0);

 // The muzzle contact stays fixed at 19.5 for every existing gameplay build.
 // Different exposed barrel lengths come from furniture and sight landmarks.
 const tip=19.5;
 const barrelStart=short?11.2:mid?12.1:rpk?13.08:12.2;
 const barrelEnd=short?tip:18.5;
 b('barrel',(barrelStart+barrelEnd)/2,0,0,barrelEnd-barrelStart,
  rpk?1.43:1.15,rpk?1.8:1.5,0);
 if(short){
  // Keep the AKS-74U's large, recognizable booster and compact front sight.
  p('barrel',[[14.8,-.98],[18.85,-1.3],[tip,-1.0],
   [tip,1.18],[18.85,1.37],[14.8,1.05]],2.85,1);
  p('barrel',[[12.05,.25],[12.95,2.85],[13.85,2.85],
   [14.1,.25]],1.75,0);
 }else{
  const sight=rpk?17.35:16.0;
  p('barrel',[[sight,.28],[sight+.22,2.94],
   [sight+1.03,2.98],[sight+1.18,.28]],1.85,0);
  if(parts.receiver==='akm'||parts.receiver==='ak103'){
   // Short, diagonal AKM-type tip; AK-103 is a requested custom visual.
   p('barrel',[[18.3,-.6],[tip,-.6],[19.25,.28],
    [18.9,.75],[18.3,.67]],2.08,1);
  }else if(rpk){
   // The RPK-74 gets a slender, long-barrel nose instead of a giant brake.
   p('barrel',[[18.3,-.53],[tip,-.53],[tip,.53],
    [18.3,.53]],1.65,1);
   // Folded bipod is a silhouette landmark, not a working mechanism.
   line('barrel',[14.2,-.65],[17.45,-1.77],.54,1.25,0);
   line('barrel',[15.0,-.55],[17.8,-1.42],.43,1.25,0);
   b('barrel',17.76,-1.65,0,.72,.45,1.45,1);
  }else if(parts.receiver==='ak105'){
   // AK-105 short 100-series brake: 74-family outline, less front length.
   p('barrel',[[17.76,-.95],[19.2,-.95],[tip,-.73],
    [tip,.75],[19.2,.95],[17.76,.95]],2.28,1);
   b('barrel',17.78,0,0,.25,2.14,2.36,0);
  }else{
   // AK-74 and AK-74M signature long, thick cylindrical brake.
   p('barrel',[[17.18,-1.08],[19.26,-1.08],[tip,-.88],
    [tip,.9],[19.26,1.08],[17.18,1.08]],2.45,1);
   b('barrel',17.19,0,0,.32,2.28,2.5,0);
  }
 }
}
