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
   finish===2&&(parts[slot]==='ak-grip-bakelite'||parts[slot]==='ak-mag545')?
    AK_WARM_RESIN:material[finish]);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:0|1|2=1)=>addCuboid(root,slot,parts[slot],index[slot]++,
   x,y,z,w,h,d,material[finish]);
 const line=(slot:SlotName,start:readonly [number,number],end:readonly [number,number],
  width:number,depth:number,finish:0|1|2=1)=>
  addBar(root,slot,parts[slot],index[slot]++,start,end,width,depth,material[finish]);

 const compact=parts.receiver==='akcompact';
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
 p('receiver',[[m.magwellCenterX-1.2,m.magwellTopY],
   [m.magwellCenterX+1.2,m.magwellTopY],
   [m.magwellCenterX+.9,m.magwellBottomY],
   [m.magwellCenterX-1.05,m.magwellBottomY]],3.3,0);
 if(compact){
  // Characteristically raised rear/cover area of a compact AK.
  p('receiver',[[-5,2.2],[-4.65,3.55],[-1.6,3.6],[-1,2.28]],2.25,1);
 }else{
  b('receiver',-3.9,2.52,0,1.15,.58,2.0,0);
 }

 // One deliberately exaggerated pixel-art selector: no extra 3D levers.
 addWeaponPixelMark(root,'ak-selector',-1.6,.42,1.98,2.5,1.05);

 // Stock types are visually disparate; the skeletal type MUST stay hollow.
 const stock=parts.stock;
 if(stock==='ak-skeleton'){
  // Preserve the successful open profile, only thicken the connecting bars.
  line('stock',[-5.25,.65],[-12.3,.55],1.0,1.05,0);
  line('stock',[-5.25,-1.35],[-12.3,-2.5],1.0,1.05,0);
  line('stock',[-5.25,-1.3],[-9.45,.15],.75,1.05,0);
  b('stock',-12.8,-1,0,1.05,3.65,2.5,1);
 }else if(stock==='ak-sidefold'){
  // One fat five-sided silhouette, not a pointed plank with floating hinge.
  p('stock',[[-13.0,.7],[-8.3,.95],[-6.0,.35],
   [-6.25,-1.5],[-9.6,-2.9],[-13.0,-2.15]],4.1,1);
 }else{
  const isWood=stock==='ak-wood'||stock==='ak-wood74';
  p('stock',[[-14.1,.65],[-8.9,.95],[-6.25,-.5],
   [-10.55,-3.35],[-14.1,-2.45]],3.95,isWood?2:1);
  if(stock==='ak-wood74')
   b('stock',-10.7,-1,1.97,2.0,.65,.18,1);
 }

 // Grips are deliberately raked, with one body prism and no modeled stippling.
 const grip=parts.grip,gripWood=grip==='ak-grip-wood',
 resin=grip==='ak-grip-bakelite';
 p('grip',shiftProfile([[-3.4,-1.65],[-.5,-1.65],[-1.0,-5.65],
  [-2.25,-6.1],[-3.7,-5.7]],m.gripShiftX),
  grip==='ak-grip-poly'?3.4:2.9,gripWood||resin?2:1);

 // A narrow receiver insertion point and broad caricatured lower swing.
 // 7.62 profiles retain a stronger banana bend than 5.45 profiles.
 const mag=parts.magazine,heavy=mag==='ak-mag762'||mag==='ak-mag762poly';
 const resinMag=mag==='ak-mag545';
 const finish:0|1|2=resinMag?2:heavy&&mag==='ak-mag762'?0:1;
 const top=m.magazineTopY;
 if(heavy)
  p('magazine',[[.05,top],[2.07,top],[2.44,-4.42],
   [4.05,-7.45],[2.0,-7.75],[.68,-5.08]],3.05,finish);
 else
  p('magazine',[[.06,top],[2.04,top],[2.24,-4.62],
   [2.95,-7.25],[1.0,-7.47],[.45,-4.95]],3.1,finish);

 const guard=parts.handguard;
 const short=guard==='ak-wood-short'||guard==='ak-poly-short';
 const mid=guard==='ak-poly-mid';
 const end=short?11.45:mid?13.5:15.1;
 const start=short?3.55:4.0;
 const woodGuard=guard==='ak-wood-long'||guard==='ak-wood-short';
 const rail=guard==='ak-rail-long';
 p('handguard',[[start,-1.35],[start+.75,1.05],[end-.7,1.05],
   [end,-.2],[end-.5,-1.75],[start+.45,-1.75]],3.85,
   woodGuard?2:1);
 // Restore a deliberate narrow gap between upper and lower furniture.
 // A chunky rear collar keeps the two silhouettes visually connected.
 p('handguard',[[start+.8,1.3],[start+1.7,2.4],
   [end-1.35,2.25],[end-.6,1.3]],2.9,woodGuard?2:1);
 b('handguard',start+.72,.42,0,.58,3.5,3.88,0);
 if(rail)b('handguard',(start+.9+end)/2,2.6,0,
  end-start-1.2,.6,3.0,0);

 // Distinct high front sight and the compact's visually large final device.
 const tip=19.5;
 const barrelStart=short?11.2:mid?13.35:14.9;
 b('barrel',(barrelStart+tip)/2,0,0,tip-barrelStart,1.23,1.5,0);
 if(short){
  // A much denser compact nose; no long pencil barrel sticking out.
  p('barrel',[[14.8,-.98],[18.85,-1.3],[19.5,-1.0],
   [19.5,1.18],[18.85,1.37],[14.8,1.05]],2.85,1);
  p('barrel',[[12.05,.25],[12.95,2.85],[13.85,2.85],
   [14.1,.25]],1.75,0);
 }else{
  p('barrel',[[16.5,.2],[16.75,3.35],[17.5,3.45],
   [17.6,.2]],1.9,0);
  b('barrel',18.6,0,0,1.8,parts.receiver==='akm'?1.75:2.4,
   parts.receiver==='akm'?1.85:2.45,1);
 }
}
