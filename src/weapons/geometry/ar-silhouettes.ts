/** Symbolic AR-family exterior. Preserve recognisable masses, not tiny details.
 * Every shape is an intentionally simplified outside contour for game art.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addBar,type Outline,type SlotName} from './profile-primitives.ts';

export function addARFamily(root:THREE.Group,build:WeaponFamilyBuild,
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

 // Upper: flat/retro identities differ chiefly in the visible TOP silhouette.
 p('receiver',[[-6.35,-.9],[-6.35,1.25],[-5.4,1.75],[3.6,1.75],
  [3.85,.55],[3.65,-.9]],3.5,0);
 p('receiver',[[-5.55,-1.1],[-2.1,-2.15],[2.2,-2.15],
  [3.45,-.85],[-5.55,-.85]],3.0,1);
 b('receiver',-5.7,-.2,0,1.1,3.5,3.6,1);
 const carry=['ar-a1','ar-a2','ar-retro'].includes(parts.receiver);
 if(carry){
  const heavy=parts.receiver==='ar-a2';
  // Open carry handle: a real gap between posts, never a solid cap block.
  line('receiver',[-4.35,1.8],[-4.35,3.7],heavy?1.25:.85,2.15,0);
  line('receiver',[1.15,1.8],[1.15,3.7],.9,2.05,0);
  b('receiver',-1.6,3.7,0,6.1,.82,2.05,0);
  if(heavy)b('receiver',-4.35,2.4,0,1.6,.95,2.4,1);
 }else{
  b('receiver',-1.5,2.05,0,8.3,.65,2.65,1);
  if(parts.receiver==='ar-flat')
   b('receiver',-4.15,2.5,0,1.5,.55,2.6,0);
 }

 // Stock: fixed triangular stock versus open shoulder / sliding-carbine outline.
 if(parts.stock==='ar-fixed'){
  p('stock',[[-13.5,.7],[-6.1,.85],[-6.05,-1.55],
   [-8.35,-3.05],[-13.5,-2.35]],3.45,1);
  b('stock',-13.2,-.65,0,.6,3.85,3.8,0);
 }else{
  b('stock',-8.65,.15,0,5.5,1.2,1.5,0);
  const compact=parts.stock==='ar-compact';
  p('stock',[[-12.25,.45],[-10.85,.8],[-9.55,.5],[-9.45,-1.85],
    [-11.6,-2.65],[-12.5,-2.0]],compact?3.5:3.1,1);
  b('stock',compact?-11.9:-12.55,-.95,0,.85,3.65,3.55,1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly',a2=parts.grip==='ar-grip-a2';
 p('grip',modern?[[-2,-1.8],[.5,-1.8],[.6,-5.5],[-.3,-6.25],[-2.65,-5.85]]:
  [[-2,-1.8],[.2,-1.8],[-.2,-5.95],[-2.15,-5.65]],
  modern?3.0:2.55,1);
 if(a2)b('grip',-.3,-3.6,1.25,.65,.9,.45,0);

 // The magazine profile uses one actually tapered/curved outline, not a pile of boxes.
 const mag=parts.magazine;
 if(mag==='ar-mag20')
  p('magazine',[[2.3,-1.75],[5.2,-1.75],[5.25,-6.2],
    [2.6,-6.25]],2.55,0);
 else if(mag==='ar-magpoly')
  p('magazine',[[2.25,-1.75],[5.5,-1.75],[5.75,-5.35],
    [6.2,-7.8],[3.1,-8.1],[2.55,-5.4]],2.9,1);
 else
  p('magazine',[[2.3,-1.75],[5.35,-1.75],[5.5,-5.2],
    [5.85,-7.8],[3.3,-7.9],[2.7,-5.2]],2.7,0);
 b('magazine',mag==='ar-mag20'?3.9:4.45,mag==='ar-mag20'?-6.3:-7.95,
  0,mag==='ar-mag20'?2.9:3.25,.52,3.0,1);

 // Four outside envelopes: triangular ribless, rounded, slim retro, heavy rail.
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const end=long?15.25:short?15.95:13.9;
 const start=3.9,top=guard==='ar-triangle'?1.75:1.6;
 if(guard==='ar-triangle'){
  p('handguard',[[start,1.45],[end,1.05],[end,-1.0],
   [start,-1.7]],3.65,1);
  b('handguard',8.9,1.45,0,9.45,.44,2.5,0);
 }else if(guard==='ar-round'||guard==='ar-carbine'||
   guard==='ar-car15-ribbed'){
  const retro=guard==='ar-car15-ribbed';
  p('handguard',[[start,1.4],[start+.7,top+(.25)], [end-.65,top],
   [end,-.85],[end-.6,-1.5],[start+.5,-1.65]],retro?2.85:3.45,1);
  b('handguard',(start+end)/2,-1.35,0,end-start-.9,.42,
   retro?2.6:3.2,0);
  if(guard==='ar-round')b('handguard',(start+end)/2,1.64,0,end-start-.8,.3,3.2,0);
 }else{
  // Flat long top and blocky rail case: visually massive but few actual solids.
  const ris=guard==='ar-risii',m5=guard==='ar-m5-rail';
  p('handguard',[[start,-1.45],[start,1.45],
   [end-.65,1.45],[end,1.05],[end,-1.3]],ris?4.2:3.75,1);
  b('handguard',(start+end)/2,1.8,0,end-start,.55,3.55,0);
  b('handguard',(start+end)/2,-1.6,0,end-start-.5,.32,3.55,0);
  if(ris||m5||guard==='ar-quad')
   b('handguard',(start+end)/2,-.25,2.1,end-start-.7,.55,.5,0);
 }

 // All variants share the authoritative X=19.5 tip: only visual profile varies.
 const barrelEnd=19.5;
 const noseStart=short?15.7:long?15.1:13.7;
 b('barrel',(noseStart+barrelEnd)/2,0,0,barrelEnd-noseStart,1.25,1.4,0);
 // Old-style raised front sight, absent on compact modern rail silhouette.
 if(!short){
  p('barrel',[[16.5,.35],[17.15,.35],[17.15,3.55],
   [16.8,3.15],[16.35,2.9]],1.7,0);
 }else b('barrel',19.06,0,0,.88,1.75,1.9,1);
}
