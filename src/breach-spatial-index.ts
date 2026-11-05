/** Site-scoped, conservative broadphase for authoritative 2D tactical geometry.
 * Buckets only remove impossible candidates. Actual wall, collision and optical
 * tests still run unchanged on live objects; door leaves remain dynamic.
 * Rebuild this index whenever activateSite replaces WALLS/COVER.
 */
import type {Obstacle,Segment} from './breach-core.ts';

const CELL=80;
type Bounds={minX:number;minY:number;maxX:number;maxY:number};
const boundsOfWall=(w:Segment):Bounds=>({
  minX:Math.min(w.a.x,w.b.x),minY:Math.min(w.a.y,w.b.y),
  maxX:Math.max(w.a.x,w.b.x),maxY:Math.max(w.a.y,w.b.y)
});
const boundsOfCover=(o:Obstacle):Bounds=>({
  minX:o.x-o.w/2,minY:o.y-o.h/2,
  maxX:o.x+o.w/2,maxY:o.y+o.h/2
});
const cellKey=(x:number,y:number)=>x+','+y;

export class TacticalGeometryIndex{
  private readonly walls:readonly Segment[];
  private readonly cover:readonly Obstacle[];
  private readonly wallCells=new Map<string,number[]>();
  private readonly coverCells=new Map<string,number[]>();
  private readonly wallSeen:Uint32Array;
  private readonly coverSeen:Uint32Array;
  private wallStamp=0;
  private coverStamp=0;
  constructor(walls:readonly Segment[],cover:readonly Obstacle[]){
    this.walls=walls;this.cover=cover;
    this.wallSeen=new Uint32Array(walls.length);
    this.coverSeen=new Uint32Array(cover.length);
    walls.forEach((w,i)=>this.insert(this.wallCells,boundsOfWall(w),i));
    cover.forEach((o,i)=>this.insert(this.coverCells,boundsOfCover(o),i));
  }
  private insert(cells:Map<string,number[]>,b:Bounds,i:number){
    for(let y=Math.floor(b.minY/CELL);y<=Math.floor(b.maxY/CELL);y++)
      for(let x=Math.floor(b.minX/CELL);x<=Math.floor(b.maxX/CELL);x++){
        const k=cellKey(x,y),bucket=cells.get(k);
        if(bucket)bucket.push(i);else cells.set(k,[i]);
      }
  }
  private query<T>(cells:Map<string,number[]>,items:readonly T[],
    seen:Uint32Array,stamp:number,b:Bounds,
    matches:(item:T,index:number)=>boolean):boolean{
    for(let y=Math.floor(b.minY/CELL);y<=Math.floor(b.maxY/CELL);y++)
      for(let x=Math.floor(b.minX/CELL);x<=Math.floor(b.maxX/CELL);x++){
        const bucket=cells.get(cellKey(x,y));
        if(!bucket)continue;
        for(const i of bucket){
          if(seen[i]===stamp)continue;
          seen[i]=stamp;
          if(matches(items[i],i))return true;
        }
      }
    return false;
  }
  someWall(b:Bounds,matches:(w:Segment,index:number)=>boolean){
    if(this.wallStamp>=0xfffffffe){this.wallSeen.fill(0);this.wallStamp=0;}
    return this.query(this.wallCells,this.walls,this.wallSeen,
      ++this.wallStamp,b,matches);
  }
  someCover(b:Bounds,matches:(o:Obstacle,index:number)=>boolean){
    if(this.coverStamp>=0xfffffffe){this.coverSeen.fill(0);this.coverStamp=0;}
    return this.query(this.coverCells,this.cover,this.coverSeen,
      ++this.coverStamp,b,matches);
  }
}
/** A conservative AABB for any segment (point rays included). */
export const rayBounds=(a:{x:number;y:number},b:{x:number;y:number},
  padding=0):Bounds=>({
  minX:Math.min(a.x,b.x)-padding,minY:Math.min(a.y,b.y)-padding,
  maxX:Math.max(a.x,b.x)+padding,maxY:Math.max(a.y,b.y)+padding
});
export const pointBounds=(p:{x:number;y:number},radius:number):Bounds=>({
  minX:p.x-radius,minY:p.y-radius,
  maxX:p.x+radius,maxY:p.y+radius
});
