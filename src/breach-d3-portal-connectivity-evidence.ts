/** D3.2 R3: offline-only, bounded physical connectivity evidence.
 * Not a route authority, live motor helper, map generator, or teleport.
 * A four-unit flood can distinguish coarse A* misses from an actually
 * disconnected sampled walkable region without weakening collision.
 */
import {OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import {bodyClear,sweptBodyClear} from './breach-navigation.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';

const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=(col:number,row:number)=>col+','+row;
export type D32ConnectivityResult={
 connected:boolean;exhausted:boolean;visited:number;
 startAnchors:number;routeSteps:number|null;first:Pt|null;last:Pt|null;
};
export function probeD32SampledConnectivity(
 from:Pt,to:Pt,doors:Door[],world:SessionWorldGeometry,
 step=4,includeLeaves=true,maxVisits=40000
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
 if(canCross(from,to))return {connected:true,exhausted:true,
   visited:0,startAnchors:1,routeSteps:1,first:{...to},last:{...to}};
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
   while(cursor!==null){
    rootKey=cursor;routeSteps++;cursor=parents.get(cursor)??null;
   }
   const [firstCol,firstRow]=rootKey.split(',').map(Number);
   return {connected:true,exhausted:true,visited,startAnchors:anchors,
     routeSteps,first:at(firstCol,firstRow),last:{...to}};
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
 return {resolution:4,
  physical:probeD32SampledConnectivity(from,to,doors,world,4,true),
  staticOnly:probeD32SampledConnectivity(from,to,doors,world,4,false)};
}
