/** 142B: real exterior window apertures, blocking low sills and
 * archetype-specific outdoor cover. Visibility and navigation use the same
 * wall/cover geometry as rendering, never a visual-only false opening. */
import {type Segment,type Obstacle,type Pt} from './breach-core.ts';
import type {Site,WindowOpening} from './breach-site.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function buildArchetypeEnvironment(site:Site,seed:number):Site{
  const minX=Math.min(...site.rooms.map(r=>r.x));
  const maxX=Math.max(...site.rooms.map(r=>r.x+r.w));
  const minY=Math.min(...site.rooms.map(r=>r.y));
  const maxY=Math.max(...site.rooms.map(r=>r.y+r.h));
  const desired=site.archetype==='garage'?1:
    site.archetype==='house'?2:site.archetype==='warehouse'?2:3;
  const eligible=site.walls.map((wall,index)=>{
    const horizontal=Math.abs(wall.a.y-wall.b.y)<.01;
    const vertical=Math.abs(wall.a.x-wall.b.x)<.01;
    const length=dist(wall.a,wall.b);
    const outside=horizontal&&Math.abs(wall.a.y-minY)<.01||
      vertical&&(Math.abs(wall.a.x-minX)<.01||
        Math.abs(wall.a.x-maxX)<.01);
    const p={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
    const clear=site.doors.every(d=>dist(p,{x:(d.a.x+d.b.x)/2,
      y:(d.a.y+d.b.y)/2})>76);
    return {wall,index,horizontal,vertical,length,outside,clear,p};
  }).filter(x=>x.outside&&x.length>116&&x.clear)
    .sort((a,b)=>b.length-a.length||a.index-b.index);
  const chosen=new Set<number>(),windows:WindowOpening[]=[];
  for(const item of eligible){
    if(windows.length>=desired)break;
    const half=26,wall=item.wall,dx=(wall.b.x-wall.a.x)/item.length,
      dy=(wall.b.y-wall.a.y)/item.length;
    const a={x:item.p.x-dx*half,y:item.p.y-dy*half};
    const b={x:item.p.x+dx*half,y:item.p.y+dy*half};
    if(dist(a,wall.a)<26||dist(b,wall.b)<26)continue;
    chosen.add(item.index);
    windows.push({id:'W'+windows.length,x:item.p.x,y:item.p.y,
      width:52,vertical:item.vertical});
  }
  const walls:Segment[]=[];
  site.walls.forEach((wall,index)=>{
    if(!chosen.has(index)){walls.push(wall);return;}
    const opening=windows.find(w=>Math.abs(w.x-(wall.a.x+wall.b.x)/2)<.1&&
      Math.abs(w.y-(wall.a.y+wall.b.y)/2)<.1)!;
    const size=dist(wall.a,wall.b);
    const ux=(wall.b.x-wall.a.x)/size,uy=(wall.b.y-wall.a.y)/size;
    const near={x:opening.x-ux*opening.width/2,
      y:opening.y-uy*opening.width/2};
    const far={x:opening.x+ux*opening.width/2,
      y:opening.y+uy*opening.width/2};
    walls.push({a:wall.a,b:near},{a:far,b:wall.b});
  });
  const cover:Obstacle[]=site.cover.slice();
  for(const opening of windows)cover.push({
    x:opening.x,y:opening.y,
    w:opening.vertical?10:opening.width,
    h:opening.vertical?opening.width:10,
    low:true,fixture:'window-sill'});
  const exteriorFixture=site.archetype==='warehouse'?'pallet':
    site.archetype==='garage'?'vehicle':
    site.archetype==='house'?'fence':
    site.archetype==='clinic'?'bench':'vehicle';
  const west=minX+82,east=maxX-82;
  const x=Math.abs(west-site.entrance.x)>Math.abs(east-site.entrance.x)?
    west:east;
  const y=maxY+79;
  if(y+25<720&&dist({x,y},site.entrance)>80)
    cover.push({x,y,w:exteriorFixture==='fence'?58:46,
      h:exteriorFixture==='fence'?10:24,
      low:exteriorFixture!=='vehicle',fixture:exteriorFixture});
  return {...site,walls,cover,windows};
}
