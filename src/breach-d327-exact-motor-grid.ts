/** D3.27D1: bounded cold A* with REAL motor-edge clearance.
 * Unlike the normal grid, this graph never accepts an endpoint-only / coarse
 * chord. The caller supplies the same 0.3-world-unit body sweep as the
 * authoritative motor, including the very first edge from the real center.
 *
 * No global site state, no door open, no authored GO edits, no movement.
 * This is first an OFFLINE Garage feasibility probe; production integration
 * requires its own separately certified release checkpoint.
 */
import type {Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Node={x:number;y:number;g:number;f:number;parent:string|null};
type HeapEntry={key:string;f:number;g:number};
const DIRECTIONS:[[number,number],...Array<[number,number]>]=[
 [1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
function push(heap:HeapEntry[],item:HeapEntry){
 heap.push(item);let i=heap.length-1;
 while(i>0){
  const p=(i-1)>>1;if(heap[p].f<=item.f)break;
  heap[i]=heap[p];i=p;
 }
 heap[i]=item;
}
function pop(heap:HeapEntry[]):HeapEntry|undefined{
 const root=heap[0],last=heap.pop();
 if(!root||!heap.length)return root;
 let i=0;
 while(true){
  let k=i*2+1;if(k>=heap.length)break;
  if(k+1<heap.length&&heap[k+1].f<heap[k].f)k++;
  if(heap[k].f>=last!.f)break;
  heap[i]=heap[k];i=k;
 }
 heap[i]=last!;return root;
}
export function coldExactMotorGridRoute(
 from:Pt,to:Pt,
 canStand:(p:Pt)=>boolean,
 motorClear:(from:Pt,to:Pt)=>boolean,
 options:{step?:number;maxExpansions?:number;padding?:number;
  maxDistance?:number;maxWaypoints?:number}={}
):Pt[]{
 const step=options.step??4,limit=options.maxExpansions??12000,
   padding=options.padding??240,maxWaypoints=options.maxWaypoints??120;
 const direct=distance(from,to),maxTravel=options.maxDistance??direct*5+260;
 if(!Number.isFinite(direct)||direct>780||direct<.01||
    !Number.isFinite(step)||step<2||step>8||
    !canStand(from)||!canStand(to)||limit<10)return [];
 if(direct<=96&&motorClear(from,to))return [{...to}];
 const minX=Math.min(from.x,to.x)-padding,
   maxX=Math.max(from.x,to.x)+padding,
   minY=Math.min(from.y,to.y)-padding,
   maxY=Math.max(from.y,to.y)+padding;
 const map=new Map<string,Node>(),queue:HeapEntry[]=[];
 const origin={x:from.x,y:from.y,g:0,f:direct,parent:null};
 map.set('0,0',origin);push(queue,{key:'0,0',f:direct,g:0});
 let terminal:string|null=null,expansions=0;
 while(queue.length&&expansions<limit){
  const entry=pop(queue)!;
  const cur=map.get(entry.key)!;
  if(entry.g!==cur.g)continue;
  expansions++;
  const loc={x:cur.x,y:cur.y};
  const dist=distance(loc,to);
  if(dist<=step*1.6&&motorClear(loc,to)){
   terminal=entry.key;break;
  }
  const [cx,cy]=entry.key.split(',').map(Number);
  for(const [dx,dy] of DIRECTIONS){
   const nx=cx+dx,ny=cy+dy;
   const pt={x:from.x+nx*step,y:from.y+ny*step};
   if(pt.x<minX||pt.x>maxX||pt.y<minY||pt.y>maxY||
      !canStand(pt)||!motorClear(loc,pt))continue;
   const length=distance(loc,pt),g=cur.g+length;
   if(g+distance(pt,to)>maxTravel+direct||g>maxTravel)continue;
   const key=nx+','+ny,prior=map.get(key);
   if(prior&&g>=prior.g-1e-6)continue;
   const heuristic=distance(pt,to);
   const next={...pt,g,f:g+heuristic,parent:entry.key};
   map.set(key,next);push(queue,{key,f:next.f,g});
  }
 }
 if(!terminal)return [];
 const reverse:Pt[]=[];let current:string|null=terminal;
 while(current&&current!=='0,0'){
  const node:Node=map.get(current)!;
  reverse.push({x:node.x,y:node.y});current=node.parent;
  if(reverse.length>maxWaypoints*4)return [];
 }
 const raw=[...reverse.reverse(),{...to}],answer:Pt[]=[];
 let at=from,i=0;
 // Compress ONLY segments that pass the exact same motor check and are
 // bounded to 96 units. Each preserved turn has an actual reachable center.
 while(i<raw.length){
  let chosen=i;
  for(let j=Math.min(raw.length-1,i+24);j>i;j--){
   if(distance(at,raw[j])<=96&&motorClear(at,raw[j])){
    chosen=j;break;
   }
  }
  if(!motorClear(at,raw[chosen]))return [];
  answer.push(raw[chosen]);at=raw[chosen];i=chosen+1;
  if(answer.length>maxWaypoints)return [];
 }
 return answer.length&&distance(answer.at(-1)!,to)<.001?answer:[];
}
