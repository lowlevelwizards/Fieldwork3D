/** D3.2 R3: offline-only, bounded physical connectivity evidence.
 * Not a route authority, live motor helper, map generator, or teleport.
 * A four-unit flood can distinguish coarse A* misses from an actually
 * disconnected sampled walkable region without weakening collision.
 */
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,type Door,type Pt} from './breach-core.ts';
import {bodyClear,sweptBodyClear} from './breach-navigation.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';

const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=(col:number,row:number)=>col+','+row;
export type D32ConnectivityResult={
 connected:boolean;exhausted:boolean;visited:number;
 startAnchors:number;routeSteps:number|null;first:Pt|null;last:Pt|null;
 /** Only materialized on explicit offline witness request. */
 path?:Pt[];
};
export function probeD32SampledConnectivity(
 from:Pt,to:Pt,doors:Door[],world:SessionWorldGeometry,
 step=4,includeLeaves=true,maxVisits=40000,witnessPath=false
):D32ConnectivityResult{
 const none=(anchors=0,visited=0,exhausted=true):D32ConnectivityResult=>
  ({connected:false,exhausted,visited,startAnchors:anchors,
    routeSteps:null,first:null,last:null});
 if(!Number.isFinite(step)||step<2||step>16||
    !Number.isInteger(maxVisits)||maxVisits<1)return none();
 const canStand=(p:Pt)=>includeLeaves?
  bodyClear(p,doors,OPERATOR_RADIUS,world):
  world.passable(p,OPERATOR_RADIUS);
 const canCross=(a:Pt,b:Pt)=>{
  if(includeLeaves)return sweptBodyClear(a,b,doors,OPERATOR_RADIUS,world);
  const count=Math.max(1,Math.ceil(gap(a,b)/2));
  for(let i=1;i<=count;i++){
   const fraction=i/count;
   if(!world.passable({x:a.x+(b.x-a.x)*fraction,
     y:a.y+(b.y-a.y)*fraction},OPERATOR_RADIUS))return false;
  }
  return true;
 };
 if(!canStand(from)||!canStand(to))return none();
 if(canCross(from,to)){
  const samples=witnessPath?Math.max(1,Math.ceil(gap(from,to)/step)):1;
  const path=witnessPath?Array.from({length:samples},(_,i)=>{
   const t=(i+1)/samples;
   return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
  }):undefined;
  return {connected:true,exhausted:true,visited:0,startAnchors:1,
   routeSteps:samples,first:path?.[0]??{...to},last:{...to},
   ...(path?{path}:{})};
 }
 const minCol=Math.ceil(world.bounds.minX/step),
  maxCol=Math.floor(world.bounds.maxX/step);
 const minRow=Math.ceil(world.bounds.minY/step),
  maxRow=Math.floor(world.bounds.maxY/step);
 const at=(col:number,row:number):Pt=>({x:col*step,y:row*step});
 const start={col:Math.round(from.x/step),row:Math.round(from.y/step)};
 const queue:{col:number;row:number;parent:string|null}[]=[];
 const parents=new Map<string,string|null>();
 const clear=new Map<string,boolean>();
 const stand=(col:number,row:number)=>{
  if(col<minCol||col>maxCol||row<minRow||row>maxRow)return false;
  const id=key(col,row),cached=clear.get(id);
  if(cached!==undefined)return cached;
  const allowed=canStand(at(col,row));
  clear.set(id,allowed);
  return allowed;
 };
 // A legal exact actor position can snap to an obstructed lattice vertex.
 // Only swept, physically reachable neighbours may seed the SAME search.
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const col=start.col+dx,row=start.row+dy,id=key(col,row);
  if(!stand(col,row)||!canCross(from,at(col,row))||parents.has(id))continue;
  parents.set(id,null);queue.push({col,row,parent:null});
 }
 const anchors=queue.length;
 if(!anchors)return none(0);
 const directions=[[1,0],[-1,0],[0,1],[0,-1]] as const;
 let head=0,visited=0;
 while(head<queue.length&&visited<maxVisits){
  const cell=queue[head++],p=at(cell.col,cell.row);
  visited++;
  if(gap(p,to)<=step*2.5&&canCross(p,to)){
   const terminal=key(cell.col,cell.row);
   let cursor:string|null=terminal,routeSteps=1,rootKey=terminal;
   const reverse:Pt[]=witnessPath?[{...to}]:[];
   while(cursor!==null){
    rootKey=cursor;routeSteps++;
    if(witnessPath){
     const [col,row]=cursor.split(',').map(Number);
     reverse.push(at(col,row));
    }
    cursor=parents.get(cursor)??null;
   }
   const [firstCol,firstRow]=rootKey.split(',').map(Number);
   return {connected:true,exhausted:true,visited,startAnchors:anchors,
     routeSteps,first:at(firstCol,firstRow),last:{...to},
     ...(witnessPath?{path:reverse.reverse()}:{})};
  }
  for(const [dx,dy] of directions){
   const col=cell.col+dx,row=cell.row+dy,id=key(col,row);
   if(parents.has(id)||!stand(col,row)||!canCross(p,at(col,row)))continue;
   parents.set(id,key(cell.col,cell.row));
   queue.push({col,row,parent:key(cell.col,cell.row)});
  }
 }
 return none(anchors,visited,head>=queue.length);
}
/** Compare exact solid-leaf topology against static walls/cover alone.
 * An exhausted false result establishes disconnection at THIS sampled
 * resolution, not a proof of global continuous-space impossibility.
 */
export function captureD32PortalConnectivity(
 from:Pt,to:Pt,doors:Door[],world:SessionWorldGeometry
){
 // Each counterfactual uses the same exact swept collision predicate;
 // door omission here only CLASSIFIES the disconnection. It never gives the
 // runtime motor permission to cross a leaf or assumes a hinge can actuate.
 const fraction=(door:Door)=>door.openFraction??(door.open?1:0);
 const hypotheticallyActuable=(door:Door)=>
  (door.kind===undefined||door.kind==='hinged')&&
  !door.locked&&!door.jammed&&!door.wedged&&!door.heldBy&&
  fraction(door)<.72;
 const stableOpen=(door:Door)=>door.open&&fraction(door)>=.72;
 const ranked=[...doors].sort((a,b)=>
  pointToSegment(from,doorLeafSegment(a))-
  pointToSegment(from,doorLeafSegment(b))||
  a.id.localeCompare(b.id));
 const nearest=ranked[0];
 const probe=(testDoors:Door[])=>
  probeD32SampledConnectivity(from,to,testDoors,world,4,true);
 const hypothetical=probeD32SampledConnectivity(from,to,
  doors.filter(d=>!hypotheticallyActuable(d)),world,4,true,40000,true);
 // The hypothetical path is NOT a runnable motor route. Record only which
 // real closed leaves it crosses, in order, and the last fully swept-safe
 // approach before its first contact. A closed door must still be opened
 // physically by the existing interaction authority.
 const sequence:{id:string;at:Pt;fraction:number}[]=[];
 let safeApproach:Pt|null=null,firstBlockedDoorId:string|null=null;
 let previous=from,actualPrefixSafe=true;
 for(const point of hypothetical.path??[]){
  if(actualPrefixSafe){
   if(sweptBodyClear(previous,point,doors,OPERATOR_RADIUS,world))
    safeApproach={...point};
   else actualPrefixSafe=false;
  }
  for(const door of doors){
   if(!hypotheticallyActuable(door)||sequence.some(s=>s.id===door.id))
    continue;
   if(!sweptBodyClear(previous,point,[door],OPERATOR_RADIUS,world)){
    if(!firstBlockedDoorId)firstBlockedDoorId=door.id;
    sequence.push({id:door.id,at:{...point},fraction:fraction(door)});
   }
  }
  previous=point;
 }
 const {path:_witnessPath,...hypotheticalSummary}=hypothetical;
 return {resolution:4,
  physical:probe(doors),
  staticOnly:probeD32SampledConnectivity(from,to,doors,world,4,false),
  withoutActuableLeaves:hypotheticalSummary,
  routePortalSequence:sequence,
  firstBlockedDoorId,
  safeApproachBeforeFirstContact:safeApproach,
  withoutStableOpenLeaves:probe(doors.filter(d=>!stableOpen(d))),
  withoutNearestLeaf:nearest?
   {omittedId:nearest.id,result:probe(doors.filter(d=>d!==nearest))}:null,
  nearbyLeaves:ranked.slice(0,8).map(d=>({
   id:d.id,fraction:fraction(d),open:d.open,
   gap:Math.round(pointToSegment(from,doorLeafSegment(d))*100)/100,
   hypotheticallyActuable:hypotheticallyActuable(d),
   stableOpen:stableOpen(d),locked:!!d.locked,
   jammed:!!d.jammed,wedged:!!d.wedged,held:!!d.heldBy
  }))};
}
