/** Bounded projectile impact evidence for rendering and replay.
 * Authoritative hits are resolved elsewhere; presentation evidence must
 * not grow unbounded in long rounds.
 */
import type {ImpactMark,Session} from './breach-game.ts';
import {IMPACT_MARK_LIMIT,BLOOD_MARK_LIMIT} from './breach-effects.ts';
import type {Segment} from './breach-core.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
/** Stable local coordinates avoid combining hits on opposite faces or
 * following a moved object's previous world location. */
function sameDamageFace(a:ImpactMark,b:ImpactMark):boolean{
 const x=a.surfaceRef,y=b.surfaceRef;
 if(!x||!y||a.surface!==b.surface||x.kind!==y.kind||x.index!==y.index||x.ownerId!==y.ownerId)return false;
 if(x.kind==='door')return x.localZ===y.localZ;
 if(x.kind==='cover')return x.nx===y.nx&&x.ny===y.ny&&x.nz===y.nz&&
  x.coverTurn===y.coverTurn&&x.coverW===y.coverW&&x.coverD===y.coverD&&x.coverToppled===y.coverToppled;
 return x.face===y.face;
}
const localDistance=(a:NonNullable<ImpactMark['surfaceRef']>,b:NonNullable<ImpactMark['surfaceRef']>)=>
 Math.hypot(a.localX-b.localX,a.localY-b.localY,a.localZ-b.localZ);
export function retainImpactMark(s:Pick<Session,'impactMarks'>,mark:ImpactMark,walls:readonly Segment[]=[]):void{
 // A final stop may already be represented by its committed material
 // event. Check the latest merged shot, without changing original ID.
 if(mark.surfaceRef&&mark.surface!=='blood'){
  const ref=mark.surfaceRef;
  const nearby=s.impactMarks.find(other=>sameDamageFace(other,mark)&&
   localDistance(other.surfaceRef!,ref)<3.5);
  if(nearby){
   if(mark.shotId!==undefined&&(nearby.lastDamageShotId??nearby.shotId)===mark.shotId)return;
   const count=Math.min(4,(nearby.damageCount??1)+1);
   if(count!==(nearby.damageCount??1)){nearby.damageCount=count;nearby.age=0;}
   nearby.lastDamageShotId=mark.shotId;
   return;
  }
 }
 if(mark.surface==='blood'){
  const kind=mark.bloodKind??'splat';
  const existing=s.impactMarks.find(other=>{
   if(other.surface!=='blood')return false;
   const otherKind=other.bloodKind??'splat';
   if(kind==='drop'?(otherKind!=='drop'&&otherKind!=='pool'):otherKind!==kind)return false;
   if(kind!=='splat'&&other.bloodOwnerId!==mark.bloodOwnerId)return false;
   const distance=Math.hypot(other.p.x-mark.p.x,other.p.y-mark.p.y);
   return distance<(kind==='drop'&&otherKind==='drop'?3:6)&&confinedGroundRadius(other.p,distance,walls)>=distance-.001;
  });
  if(existing){
   const amount=Math.min(16,(existing.bloodAmount??1)+(mark.bloodAmount??1));
   if(amount!==(existing.bloodAmount??1)){existing.bloodAmount=amount;existing.age=0;}
   if(kind==='drop'&&existing.bloodKind==='drop'){
    existing.bloodDrops=Math.min(4,(existing.bloodDrops??1)+(mark.bloodDrops??1));
    if(existing.bloodDrops>=4){existing.bloodKind='pool';existing.age=0;}
   }
   return;
  }
  const blood=s.impactMarks.filter(other=>other.surface==='blood');
  if(blood.length>=BLOOD_MARK_LIMIT){
   const oldest=s.impactMarks.findIndex(other=>other.surface==='blood');
   if(oldest>=0)s.impactMarks.splice(oldest,1);
  }
 }
 s.impactMarks.push(mark);
 while(s.impactMarks.length>IMPACT_MARK_LIMIT){
  const transient=s.impactMarks.findIndex(m=>m.surface!=='blood'&&!m.surfaceRef);
  const other=transient>=0?transient:s.impactMarks.findIndex(m=>m.surface!=='blood');
  s.impactMarks.splice(other<0?0:other,1);
 }
}
