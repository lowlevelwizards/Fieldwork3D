/** BT4: shared pure recipe for the actual chest-rig pouch artwork and its
 * capacity metadata. Same authored positions, no mesh construction needed
 * by roster/campaign/preflight. Historical waist pouches retain their
 * existing art-specific lane definitions. */
import {rigVisualBudget} from './operator-rig-visual-standards.ts';
import type {MagazinePouchCell} from './operator-magazine-pouch-fit.ts';
export const RIG_MAGAZINE_POUCH_PUFF=1.00;
export type RigPouchSpec=readonly [x:number,y:number,z:number,h:number,w:number,depth:number,magazine:boolean,yaw:number];
export function authoredRigPouches(style:string):RigPouchSpec[]{
 const out:RigPouchSpec[]=[];
 const p=(x:number,y:number,z:number,h:number,w:number,d:number,mag=true,yaw=0)=>out.push([x,y,z,h,w,d,mag,yaw]);
 switch(style){
 case 'chest-placard':for(const z of [-2.73,0,2.73])p(8.74,-2.20,z,3.85,2.55,1.08);break;
 case 'micro-rig':
  for(const z of [-1.65,1.65])p(8.54,-2.14,z,3.60,2.80,.91);
  for(const s of [-1,1])p(7.75,-2.62,s*4.60,2.26,1.52,.77,false);break;
 case 'light-rig':for(const z of [-4.85,-1.63,1.63,4.85])p(8.38,-2.18,z,4.63,2.70,1.10);break;
 case 'split-front':for(const s of [-1,1])for(const z of [3.15,5.92])p(8.77,-2.22,s*z,4.35,2.55,1.11);break;
 case 'lbv':for(const s of [-1,1])for(const y of [1.28,-2.56,-5.35])p(8.12,y,s*4.20,3.45,3.38,.99,y!==-5.35);break;
 case 'full-chest':for(const z of [-4.60,-1.5,1.5,4.60])p(8.65,-3.23,z,4.50,2.58,1.17);break;
 case 'belt-harness':for(const s of [-1,1])p(3.1,-5.30,s*7.65,5.30,3.40,1.49,false);break;
 case 'chicom-rig':
  for(const z of [-3.12,0,3.12])p(8.52,-2.32,z,5.72,2.88,1.06);
  for(const s of [-1,1])p(8.42,-3.46,s*5.65,2.38,1.65,.75,false);break;
 case 'bandolier':for(let i=0;i<5;i++){const t=i/4;p(8.20,3.6-t*7.4,3.85-t*7.7,i<4?3.45:2.65,1.76,i<4?1.40:.78,i<4,Math.PI/2);}break;
 case 'sadf-webbing':for(const s of [-1,1])for(const z of [3.25,6.05])p(7.78,-2.95,s*z,6.35,2.67,1.52);break;
 }
 return out;
}
export function rigPouchCell(style:string,spec:RigPouchSpec):MagazinePouchCell{
 const [x,y,z,h,d,depth,,yaw]=spec,extra=rigVisualBudget(style).projection;
 return {x:x+(extra+RIG_MAGAZINE_POUCH_PUFF)*.5,y,z,height:h,
  width:d+(d>=2.3?.17:.11),depth:depth+extra+RIG_MAGAZINE_POUCH_PUFF,yaw};
}
export function historicalRigCells(style:string,variant='late'):MagazinePouchCell[]{
 const cells:MagazinePouchCell[]=[];
 if(style==='field-webbing')for(const side of [-1,1])for(const x of [2.30,-.65,-3.60])
  cells.push({x:x+.25,y:.10,z:side*7.20,depth:3.50,height:3.66,width:2.56,yaw:side*Math.PI/2});
 if(style==='alice-lc2')for(let lane=0;lane<3;lane++)for(const side of [-1,1])
  cells.push({x:1.55,y:-.18,z:side*7.02,depth:5.0,height:3.68,width:2.78,yaw:0,slots:[-1.45,0,1.45],slot:lane});
 if(style==='m1956-lce')for(let lane=0;lane<2;lane++)for(const side of [-1,1])
  cells.push({x:variant==='early'?1.60:1.58,y:-.18,z:side*7.06,depth:4.70,height:3.67,width:3.06,yaw:0,slots:[-.92,.92],slot:lane});
 return cells;
}
export function authoredRigStorageCells(style:string,variant='late'){
 const waist=historicalRigCells(style,variant),specs=authoredRigPouches(style);
 const magazines=waist.length?waist:specs.filter(s=>s[6]).map(s=>rigPouchCell(style,s));
 const auxiliary=specs.filter(s=>!s[6]).map(s=>rigPouchCell(style,s));
 // The P83 lower waist bags are actual closed cargo, not more magazine cells.
 if(style==='sadf-webbing')for(const side of [-1,1])for(const x of [2.1,-1.30])
  auxiliary.push({x:x+.25,y:.16,z:side*7.32,depth:3.85,height:4.38,width:3.02,yaw:side*Math.PI/2});
 return {magazines,auxiliary};
}
