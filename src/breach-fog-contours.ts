/** Presentation-only contours for the coarse 10-unit remembered-ground grid.
 * This is an oriented marching-squares boundary walk: an edge exists only
 * when an observed square borders an unobserved square. Diagonal contacts
 * remain disconnected (no invented discovery across corners).
 */
export type FogCell={col:number;row:number};
export type FogContourPoint={x:number;y:number};
type Edge={sx:number;sy:number;ex:number;ey:number;dir:number;used:boolean};
const key=(x:number,y:number)=>x+','+y;

export function traceFogCellContours(cells:readonly FogCell[]):FogContourPoint[][]{
  const known=new Set(cells.map(c=>key(c.col,c.row)));
  const edges:Edge[]=[];
  const from=new Map<string,Edge[]>();
  const add=(sx:number,sy:number,ex:number,ey:number,dir:number)=>{
    const edge={sx,sy,ex,ey,dir,used:false};
    edges.push(edge);
    const id=key(sx,sy),list=from.get(id);
    if(list)list.push(edge);else from.set(id,[edge]);
  };
  for(const id of known){
    const [x,y]=id.split(',').map(Number);
    if(!known.has(key(x,y-1)))add(x,y,x+1,y,0);       // east
    if(!known.has(key(x+1,y)))add(x+1,y,x+1,y+1,1);   // south
    if(!known.has(key(x,y+1)))add(x+1,y+1,x,y+1,2);   // west
    if(!known.has(key(x-1,y)))add(x,y+1,x,y,3);       // north
  }
  const contours:FogContourPoint[][]=[];
  for(const start of edges){
    if(start.used)continue;
    let edge=start,closed=false;
    const points:FogContourPoint[]=[{x:start.sx,y:start.sy}];
    for(let count=0;count<=edges.length;count++){
      if(edge.used)break;
      edge.used=true;
      points.push({x:edge.ex,y:edge.ey});
      if(edge.ex===start.sx&&edge.ey===start.sy){closed=true;break;}
      const options=(from.get(key(edge.ex,edge.ey))??[])
        .filter(candidate=>!candidate.used);
      if(!options.length)break;
      // Prefer the clockwise turn to keep diagonally touching regions
      // separate rather than joining them across an unknown corner.
      const priority=(candidate:Edge)=>{
        const turn=(candidate.dir-edge.dir+4)%4;
        return turn===1?0:turn===0?1:turn===3?2:3;
      };
      options.sort((a,b)=>priority(a)-priority(b));
      edge=options[0];
    }
    if(!closed)return []; // Safe fallback to the exact rectangular mask.
    points.pop(); // Repeated first vertex is implicit in closePath().
    if(points.length>=4)contours.push(points);
  }
  return contours;
}

/** Append rounded vector contours to the current canvas path. Units remain
 * in world space; Canvas 2D and the existing 3D linear sampler antialias them.
 * The caller MUST clip to the original observed cells before erasing fog,
 * because an unconstrained concave spline could expose unknown territory.
 */
export function appendSmoothFogContours(ctx:CanvasRenderingContext2D,
  contours:readonly (readonly FogContourPoint[])[],cellSize=10):void{
  for(const points of contours){
    const n=points.length;
    if(n<4)continue;
    const segments=points.map((p,i)=>{
      const prev=points[(i+n-1)%n],next=points[(i+1)%n];
      const incoming=Math.hypot(p.x-prev.x,p.y-prev.y);
      const outgoing=Math.hypot(next.x-p.x,next.y-p.y);
      const trim=Math.min(.28,incoming*.42,outgoing*.42);
      return {
        before:{x:(p.x-(p.x-prev.x)/incoming*trim)*cellSize,
          y:(p.y-(p.y-prev.y)/incoming*trim)*cellSize},
        corner:{x:p.x*cellSize,y:p.y*cellSize},
        after:{x:(p.x+(next.x-p.x)/outgoing*trim)*cellSize,
          y:(p.y+(next.y-p.y)/outgoing*trim)*cellSize}
      };
    });
    ctx.moveTo(segments[0].after.x,segments[0].after.y);
    for(let i=1;i<=n;i++){
      const p=segments[i%n];
      ctx.lineTo(p.before.x,p.before.y);
      ctx.quadraticCurveTo(p.corner.x,p.corner.y,p.after.x,p.after.y);
    }
    ctx.closePath();
  }
}
