/** Stylized AK-family exterior language. Big shapes and negative space,
 * not miniature mechanical hardware. Game-only muzzle/contact remain elsewhere.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';
import {AK_WARM_RESIN} from './weapon-visual-palette.ts';

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
  // Preserve the successful open profile, only thicken the connecting bars.
  line('stock',[-5.25,.65],[-12.3,.55],1.0,1.05,0);
  line('stock',[-5.25,-1.35],[-12.3,-2.5],1.0,1.05,0);
  line('stock',[-5.25,-1.3],[-9.45,.15],.75,1.05,0);
  b('stock',-12.8,-1,0,1.05,3.65,2.5,1);
 }else if(stock==='ak-sidefold'){
  // One fat five-sided silhouette, not a pointed plank with floating hinge.
  p('stock',[[-12.25,.7],[-8.3,.95],[-6.0,.35],
   [-6.25,-1.5],[-9.6,-2.9],[-12.25,-2.15]],4.1,1);
 }else{
  const isWood=stock==='ak-wood'||stock==='ak-wood74';
  p('stock',[[-13.5,.65],[-8.9,.95],[-6.25,-.5],
   [-10.55,-3.35],[-13.5,-2.45]],3.95,isWood?2:1);
  if(stock==='ak-wood74')
   b('stock',-10.7,-1,1.97,2.0,.65,.18,1);
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
 // One thick prism, with only one or two deliberate changes in direction.
 if(heavy)
  p('magazine',[[2.15,-1.65],[5.9,-1.65],[6.65,-4.5],
   [8.95,-7.5],[5.65,-8.05],[3.35,-5.15]],3.45,finish);
 else
  p('magazine',[[2.15,-1.65],[5.6,-1.65],[5.9,-4.7],
   [7.25,-7.55],[4.5,-7.9],[3.35,-5.2]],3.25,finish);

 const guard=parts.handguard;
 const short=guard==='ak-wood-short'||guard==='ak-poly-short';
 const mid=guard==='ak-poly-mid';
 const end=short?11.45:mid?13.5:15.1;
 const start=short?3.55:4.0;
 const woodGuard=guard==='ak-wood-long'||guard==='ak-wood-short';
 const rail=guard==='ak-rail-long';
 p('handguard',[[start,-1.35],[start+.75,.95],[end-.7,.85],
   [end,-.2],[end-.5,-1.75],[start+.45,-1.75]],3.85,
   woodGuard?2:1);
 // One large top silhouette, deliberately separated but not disconnected.
 p('handguard',[[start+.8,1.2],[start+1.7,2.4],
   [end-1.35,2.25],[end-.6,1.15]],2.9,woodGuard?2:1);
 if(rail)b('handguard',(start+.9+end)/2,2.6,0,
  end-start-1.2,.6,3.0,0);

 // Distinct high front sight and the compact's visually large final device.
 const tip=19.5;
 const barrelStart=short?11.2:mid?13.35:14.9;
 b('barrel',(barrelStart+tip)/2,0,0,tip-barrelStart,1.23,1.5,0);
 if(short){
  // A much denser compact nose; no long pencil barrel sticking out.
  p('barrel',[[14.8,-1.1],[18.85,-1.5],[19.5,-1.05],
   [19.5,1.35],[18.85,1.55],[14.8,1.15]],2.9,1);
  p('barrel',[[12.05,.25],[12.95,2.85],[13.85,2.85],
   [14.1,.25]],1.75,0);
 }else{
  p('barrel',[[16.5,.2],[16.75,3.35],[17.5,3.45],
   [17.6,.2]],1.9,0);
  b('barrel',18.6,0,0,1.8,parts.receiver==='akm'?1.75:2.4,
   parts.receiver==='akm'?1.85:2.45,1);
 }
}
