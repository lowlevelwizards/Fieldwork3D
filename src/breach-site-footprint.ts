/** VIS-02: Exterior briefing is about *accessible external space*, not
 * any void between rectangular rooms. A closed internal court remains unknown.
 * Generated room modules form the authoritative physical building footprint.
 */
import type {Pt} from './breach-core.ts';
import type {Site} from './breach-site.ts';
const STEP=10;
type ExteriorGrid={minX:number;minY:number;cols:number;rows:number;
  reachable:Uint8Array};
const caches=new WeakMap<Site,ExteriorGrid>();
export function insideSiteFootprint(site:Site,p:Pt):boolean{
  return site.rooms.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&
    p.y>=r.y&&p.y<=r.y+r.h);
}
function buildGrid(site:Site):ExteriorGrid{
 const rooms=site.rooms;
 const minX=Math.floor((Math.min(...rooms.map(r=>r.x))-30)/STEP)*STEP;
 const minY=Math.floor((Math.min(...rooms.map(r=>r.y))-30)/STEP)*STEP;
 const maxX=Math.ceil((Math.max(...rooms.map(r=>r.x+r.w))+30)/STEP)*STEP;
 const maxY=Math.ceil((Math.max(...rooms.map(r=>r.y+r.h))+30)/STEP)*STEP;
 const cols=Math.max(1,Math.ceil((maxX-minX)/STEP));
 const rows=Math.max(1,Math.ceil((maxY-minY)/STEP));
 const blocked=new Uint8Array(cols*rows);
 for(const r of rooms){
   const left=Math.max(0,Math.floor((r.x-minX)/STEP));
   const right=Math.min(cols-1,Math.ceil((r.x+r.w-minX)/STEP));
   const top=Math.max(0,Math.floor((r.y-minY)/STEP));
   const bottom=Math.min(rows-1,Math.ceil((r.y+r.h-minY)/STEP));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
     const px=minX+(x+.5)*STEP,py=minY+(y+.5)*STEP;
     if(px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h)
       blocked[y*cols+x]=1;
   }
 }
 const reachable=new Uint8Array(cols*rows),queue:number[]=[];
 const enqueue=(index:number)=>{
   if(index<0||index>=blocked.length||blocked[index]||reachable[index])return;
   reachable[index]=1;queue.push(index);
 };
 for(let x=0;x<cols;x++){enqueue(x);enqueue((rows-1)*cols+x);}
 for(let y=0;y<rows;y++){enqueue(y*cols);enqueue(y*cols+cols-1);}
 for(let head=0;head<queue.length;head++){
   const i=queue[head],x=i%cols,y=Math.floor(i/cols);
   if(x>0)enqueue(i-1);
   if(x+1<cols)enqueue(i+1);
   if(y>0)enqueue(i-cols);
   if(y+1<rows)enqueue(i+cols);
 }
 return {minX,minY,cols,rows,reachable};
}
/** Only external regions connected to the surrounding property are prebriefed. */
export function exteriorBriefedAt(site:Site|undefined,p:Pt):boolean{
 if(!site)return !(p.x>112&&p.x<590&&p.y>100&&p.y<532);
 if(insideSiteFootprint(site,p))return false;
 if(site.rooms.length===0)return true;
 let grid=caches.get(site);
 if(!grid){grid=buildGrid(site);caches.set(site,grid);}
 const x=Math.floor((p.x-grid.minX)/STEP);
 const y=Math.floor((p.y-grid.minY)/STEP);
 if(x<0||y<0||x>=grid.cols||y>=grid.rows)return true;
 return grid.reachable[y*grid.cols+x]===1;
}
/** Whether a *physical exterior* wall belongs to the publicly known perimeter. */
export function accessibleExteriorWall(site:Site|undefined,wall:{a:Pt;b:Pt}):boolean{
 if(!site)return true;
 const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
 const length=Math.hypot(dx,dy);
 if(length<.01)return false;
 const nx=-dy/length*12,ny=dx/length*12;
 for(const t of [.25,.5,.75]){
   const x=wall.a.x+dx*t,y=wall.a.y+dy*t;
   const a={x:x+nx,y:y+ny},b={x:x-nx,y:y-ny};
   const ia=insideSiteFootprint(site,a),ib=insideSiteFootprint(site,b);
   if(ia!==ib&&exteriorBriefedAt(site,ia?b:a))return true;
 }
 return false;
}
