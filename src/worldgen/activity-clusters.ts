/** Reusable object-use clusters: dependent objects belong near the
 * equipment people use them with, not at arbitrary unrelated corners.
 * Returns candidates only. The authoritative solver still validates walls,
 * door approaches, physical overlap and circulation reservations.
 */
import type {Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
export type ClusterRelationship='beside'|'front'|'around';
export type ActivityCluster={
 id:string;purpose:readonly string[];anchor:string;
 companion:string;relation:ClusterRelationship;gap:number;
};
export const ACTIVITY_CLUSTERS:readonly ActivityCluster[]=[
 {id:'living-side-table',purpose:['living','studio','guest'],
  anchor:'sofa',companion:'side-table',relation:'beside',gap:8},
 {id:'armchair-side-table',purpose:['living','studio','guest'],
  anchor:'armchair',companion:'side-table',relation:'beside',gap:8},
 {id:'living-coffee',purpose:['living','studio'],anchor:'sofa',
  companion:'coffee-table',relation:'front',gap:12},
 {id:'bedside',purpose:['bedroom','guest','studio'],anchor:'bed',
  companion:'nightstand',relation:'beside',gap:8},
 {id:'desk-chair',purpose:['office','study','cubicles','staff'],
  anchor:'desk',companion:'office-chair',relation:'front',gap:9},
 {id:'reception-seat',purpose:['reception','lobby'],
  anchor:'reception-desk',companion:'office-chair',relation:'front',gap:10},
 {id:'dining-chair',purpose:['dining','break'],anchor:'dining-table',
  companion:'chair',relation:'around',gap:10},
 {id:'meeting-seat',purpose:['meeting'],anchor:'meeting-table',
  companion:'chair',relation:'around',gap:10},
 {id:'repair-tools',purpose:['workshop','bay','maintenance'],
  anchor:'workbench',companion:'tool-chest',relation:'beside',gap:9},
 {id:'clinical-cart',purpose:['exam','treatment'],anchor:'exam-bed',
  companion:'instrument-cart',relation:'beside',gap:13},
 {id:'packing-cart',purpose:['packing','loading'],anchor:'packing-station',
  companion:'cart',relation:'beside',gap:12}
];
const inside=(room:Room,p:Pt,w:number,h:number):boolean=>
 p.x-w/2>=room.x+9&&p.x+w/2<=room.x+room.w-9&&
 p.y-h/2>=room.y+9&&p.y+h/2<=room.y+room.h-9;
export function activityClusterCandidates(room:Room,fixture:string,w:number,h:number,
 placed:readonly Obstacle[]):Pt[]{
 const result:Pt[]=[];
 for(const cluster of ACTIVITY_CLUSTERS){
  if(cluster.companion!==fixture||!cluster.purpose.includes(room.purpose??''))continue;
  const anchors=placed.filter(o=>o.fixture===cluster.anchor&&
    o.x>=room.x&&o.x<=room.x+room.w&&o.y>=room.y&&o.y<=room.y+room.h);
  for(const anchor of anchors){
   const dx=anchor.w/2+w/2+cluster.gap;
   const dy=anchor.h/2+h/2+cluster.gap;
   const offsets=cluster.relation==='beside'?
     [{x:dx,y:0},{x:-dx,y:0},{x:0,y:dy},{x:0,y:-dy}]:
    cluster.relation==='front'?
     [{x:0,y:dy},{x:0,y:-dy},{x:dx,y:0},{x:-dx,y:0}]:
     [{x:0,y:dy},{x:dx,y:0},{x:0,y:-dy},{x:-dx,y:0}];
   for(const offset of offsets){
    const p={x:anchor.x+offset.x,y:anchor.y+offset.y};
    if(inside(room,p,w,h)&&!result.some(x=>Math.hypot(x.x-p.x,x.y-p.y)<1))
      result.push(p);
   }
  }
 }
 return result;
}
