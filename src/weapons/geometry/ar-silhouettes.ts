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
  // One five-sided classic rifle wedge, including its rear plate.
  p('stock',[[-13.5,.65],[-6.05,.7],[-6.05,-1.7],
   [-9.0,-3.1],[-13.5,-2.4]],3.8,1);
 }else{
  const compact=parts.stock==='ar-compact';
  const rear=compact?-11.7:-12.3;
  // Two connected forms: one slim extension and one thick five/six-sided end.
  b('stock',-8.35,.1,0,5.8,1.25,1.65,0);
  p('stock',[[rear,.55],[rear+1.0,.8],[rear+2.75,.45],
   [rear+2.75,-1.55],[rear+.75,-2.85],[rear,-2.05]],
   compact?3.85:3.45,compact?2:1);
 }

 // Pistol grips share the same root, but the modern shape has a fuller heel.
 const modern=parts.grip==='ar-grip-poly';
 p('grip',modern?
  [[-2.2,-1.7],[.6,-1.7],[.45,-5.25],[-.45,-5.85],[-2.7,-5.65]]:
  [[-2.0,-1.7],[.4,-1.7],[-.2,-5.75],[-2.45,-5.7]],
  modern?3.25:2.95,1);

 // The magazine profile uses one actually tapered/curved outline, not a pile of boxes.
 const mag=parts.magazine;
 if(mag==='ar-mag20')
  p('magazine',[[2.15,-1.72],[5.45,-1.72],[5.55,-6.3],
   [2.15,-6.35]],3.0,0);
 else if(mag==='ar-magpoly')
  p('magazine',[[2.15,-1.72],[5.65,-1.72],[5.8,-4.65],
   [6.4,-7.15],[2.9,-7.4],[2.6,-4.6]],3.45,1);
 else
  p('magazine',[[2.1,-1.72],[5.55,-1.72],[5.8,-4.9],
   [6.15,-7.5],[2.85,-7.6],[2.6,-5.0]],3.05,0);

 // Four outside envelopes: triangular ribless, rounded, slim retro, heavy rail.
 const guard=parts.handguard;
 const long=['ar-triangle','ar-round','ar-m5-rail'].includes(guard);
 const short=['ar-compact-rail','ar-risii'].includes(guard);
 const end=long?15.25:short?15.95:13.9;
 const start=3.9,top=guard==='ar-triangle'?1.75:1.6;
 if(guard==='ar-triangle'){
  // One long block with an iconic triangular taper, no tiny rail strips.
  p('handguard',[[start,1.65],[end,1.15],[end,-1.15],
   [start,-1.8]],3.85,1);
 }else if(guard==='ar-round'||guard==='ar-carbine'||
   guard==='ar-car15-ribbed'){
  const retro=guard==='ar-car15-ribbed';
  p('handguard',[[start,1.35],[start+.8,1.7],[end-.7,1.6],
   [end,-.9],[end-.6,-1.65],[start+.5,-1.65]],
   retro?3.15:3.85,1);
 }else{
  const ris=guard==='ar-risii';
  // Single squared shell and its raised rail, rather than stacked strips.
  p('handguard',[[start,-1.65],[start,1.55],
   [end-.55,1.55],[end,1.05],[end,-1.4]],
   ris?4.6:4.0,ris?2:1);
  b('handguard',(start+end)/2,1.86,0,end-start,.64,
   ris?4.15:3.7,ris?2:0);
 }

 // All variants share the authoritative X=19.5 tip: only visual profile varies.
 const barrelEnd=19.5;
 const noseStart=short?15.7:long?15.1:13.7;
 b('barrel',(noseStart+barrelEnd)/2,0,0,barrelEnd-noseStart,1.25,1.4,0);
 // Old-style raised front sight, absent on compact modern rail silhouette.
 if(!short){
  // Oversized A-frame front sight: genuine open V negative space.
  line('barrel',[16.35,.35],[16.8,3.45],.78,1.75,0);
  line('barrel',[17.35,.35],[16.8,3.45],.78,1.75,0);
 }else b('barrel',19.06,0,0,.88,1.75,1.9,1);
}
