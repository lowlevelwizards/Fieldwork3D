/** Stylized AK-family exterior language. Big shapes and negative space,
 * not miniature mechanical hardware. Game-only muzzle/contact remain elsewhere.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';

export function addAKFamily(root:THREE.Group,build:WeaponFamilyBuild,
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

 const compact=parts.receiver==='akcompact';
 // Sloping stamped-look receiver and stepped roof. Core shared when authentic.
 p('receiver',[[-6.55,-1.25],[-6.45,1.05],[-5.45,1.15],[3.9,1.1],
  [4.15,-1.05],[-3.15,-2.05]],3.65,0);
 p('receiver',[[-5.8,1.1],[-5.2,2.25],[1.6,2.3],[3.0,1.8],
  [3.25,1.05]],3.4,1);
 b('receiver',-4.25,-.05,2.05,2.8,1.15,.5,1);
 b('receiver',1.65,-1.2,0,4.0,1.1,3.25,0);
 if(compact){
  // Characteristically raised rear/cover area of a compact AK.
  p('receiver',[[-5,2.2],[-4.65,3.55],[-1.6,3.6],[-1,2.28]],2.25,1);
 }else{
  b('receiver',-3.9,2.52,0,1.15,.58,2.0,0);
 }

 // Stock types are visually disparate; the skeletal type MUST stay hollow.
 const stock=parts.stock;
 if(stock==='ak-skeleton'){
  line('stock',[-6.45,.65],[-12.25,.55],.78,.9,0);
  line('stock',[-6.45,-1.35],[-12.25,-2.5],.78,.9,0);
  line('stock',[-6.4,-1.3],[-9.45,.15],.57,.9,0);
  b('stock',-12.8,-1,0,1.05,3.65,2.5,1);
 }else if(stock==='ak-sidefold'){
  p('stock',[[-13.0,-1.65],[-13.0,.45],[-7.05,1.05],[-6.35,-1.25],
   [-10.7,-2.8]],3.25,1);
  b('stock',-13.05,-1,0,.8,3.65,3.65,1);
  b('stock',-7.85,.75,1.5,1.5,.44,.45,0);
 }else{
  const isWood=stock==='ak-wood'||stock==='ak-wood74';
  p('stock',[[-13.5,-1.65],[-13.35,.4],[-7.55,1.1],
   [-6.35,-.85],[-10.5,-3.3]],3.4,isWood?2:1);
  b('stock',-13.25,-.75,0,.65,4.0,3.55,1);
  if(stock==='ak-wood74')
   b('stock',-10.7,-.95,1.75,2.45,.8,.15,1);
 }

 // Grips are deliberately raked, with one body prism and no modeled stippling.
 const grip=parts.grip,gripWood=grip==='ak-grip-wood',
 resin=grip==='ak-grip-bakelite';
 p('grip',[[-3.35,-1.7],[-.55,-1.7],[-.95,-5.85],
  [-2.2,-6.25],[-3.65,-5.8]],grip==='ak-grip-poly'?3.15:2.7,
  gripWood||resin?2:1);
 if(grip==='ak-grip-poly')b('grip',-2.25,-5.95,0,2.7,.45,3.1,1);

 // Recognisable AK magazine curve must be in exterior contour, not block steps.
 const mag=parts.magazine,heavy=mag==='ak-mag762'||mag==='ak-mag762poly';
 const resinMag=mag==='ak-mag545';
 const finish:0|1|2=resinMag?2:heavy&&mag==='ak-mag762'?0:1;
 if(heavy)
  p('magazine',[[2.3,-1.65],[5.6,-1.65],[6.5,-4.4],
   [8.2,-6.7],[10.0,-8.05],[7.35,-8.6],
   [4.9,-7.0],[3.35,-4.8]],2.65,finish);
 else
  p('magazine',[[2.3,-1.65],[5.4,-1.65],[5.65,-4.6],
   [6.7,-7.2],[7.45,-8.05],[4.75,-8.25],
   [3.7,-5.7]],2.65,finish);
 b('magazine',heavy?8.6:6.0,heavy?-8.3:-8.08,
  0,heavy?3.15:2.9,.55,2.85,finish);

 const guard=parts.handguard;
 const short=guard==='ak-wood-short'||guard==='ak-poly-short';
 const mid=guard==='ak-poly-mid';
 const end=short?11.45:mid?13.5:15.1;
 const woodGuard=guard==='ak-wood-long'||guard==='ak-wood-short';
 const rail=guard==='ak-rail-long';
 p('handguard',[[4.0,-1.25],[4.7,.9],[end-.8,.8],
   [end,-.15],[end-.6,-1.65],[4.5,-1.65]],3.4,woodGuard?2:1);
 // Separated upper tube: preserving a dark negative-space break is iconic.
 p('handguard',[[5.0,1.4],[6.3,2.5],[end-1.7,2.25],
   [end-.75,1.35]],2.5,woodGuard?2:1);
 b('handguard',end-.35,-.45,0,.75,2.8,3.4,0);
 if(rail)b('handguard',(4.9+end)/2,2.6,0,end-5.3,.52,2.7,0);

 // Distinct high front sight and the compact's visually large final device.
 const tip=19.5;
 const barrelStart=short?11.2:mid?13.35:14.9;
 b('barrel',(barrelStart+tip)/2,0,0,tip-barrelStart,1.23,1.5,0);
 if(short){
  p('barrel',[[15.15,-.9],[18.85,-1.3],[19.5,-.95],
   [19.5,1.15],[18.85,1.35],[15.15,.95]],2.55,1);
  p('barrel',[[12.0,.25],[13,2.7],[13.8,2.7],[14.25,.25]],1.5,0);
 }else{
  p('barrel',[[16.5,.2],[16.75,3.35],[17.5,3.45],
   [17.6,.2]],1.9,0);
  b('barrel',18.6,0,0,1.8,parts.receiver==='akm'?1.75:2.4,
   parts.receiver==='akm'?1.85:2.45,1);
 }
}
