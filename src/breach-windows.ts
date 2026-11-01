/** 142B: real exterior window apertures, blocking low sills and
 * archetype-specific outdoor cover. Visibility and navigation use the same
 * wall/cover geometry as rendering, never a visual-only false opening. */
import {type Segment,type Obstacle,type Pt} from './breach-core.ts';
import type {Site,WindowOpening,WindowStyle,BuildingArchetype} from './breach-site.ts';
import {addExteriorProperty} from './worldgen/exterior-sites.ts';
import {addCoveredEntries} from './worldgen/entry-shelters.ts';
import {addSecurityPerimeter} from './worldgen/security-perimeter.ts';
import {addInteriorGlazing} from './worldgen/interior-glazing.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const windowStyles:Record<BuildingArchetype,readonly WindowStyle[]>={
 house:['standard','tall','bay','awning'],
 townhouse:['standard','tall','bay','awning'],
 apartment:['standard','tall','standard','awning'],
 retail:['picture','tall','standard'],
 office:['tall','picture','clerestory'],
 garage:['industrial','awning'],
 warehouse:['industrial','clerestory'],
 restaurant:['picture','bay','awning'],
 motel:['standard','picture','awning'],
 utility:['industrial','wire'],
 clinic:['tall','picture','wire'],
};
export function openingStyle(kind:BuildingArchetype|undefined,seed:number,index:number):WindowStyle{
 const list=windowStyles[kind??'house'];
 return list[(Math.abs(seed)+index*3)%list.length];
}
export function buildArchetypeEnvironment(site:Site,seed:number):Site{
  const minX=Math.min(...site.rooms.map(r=>r.x));
  const maxX=Math.max(...site.rooms.map(r=>r.x+r.w));
  const minY=Math.min(...site.rooms.map(r=>r.y));
  const maxY=Math.max(...site.rooms.map(r=>r.y+r.h));
  // Daylight is a room-use requirement, not a universal three-window budget.
  // Keep a moderate cap so glass colliders and tactical visibility stay cheap.
  const habitable=site.rooms.filter(r=>r.kind==='room');
  const density=['garage','warehouse','utility'].includes(site.archetype??'')?.42:.72;
  const maxWindows=site.scale==='small'?4:site.scale==='large'?12:9;
  const desired=Math.min(maxWindows,Math.max(2,Math.ceil(habitable.length*density)));
  const eligible=site.walls.map((wall,index)=>{
    const horizontal=Math.abs(wall.a.y-wall.b.y)<.01;
    const vertical=Math.abs(wall.a.x-wall.b.x)<.01;
    const length=dist(wall.a,wall.b);
    const p={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
    const occupied=(q:Pt)=>site.rooms.find(r=>
      q.x>r.x+1&&q.x<r.x+r.w-1&&q.y>r.y+1&&q.y<r.y+r.h-1);
    // One occupied side and one outdoors: genuine external glazing only.
    const onA=occupied({x:p.x+(vertical?13:0),y:p.y+(horizontal?13:0)});
    const onB=occupied({x:p.x-(vertical?13:0),y:p.y-(horizontal?13:0)});
    const outside=(horizontal||vertical)&&Boolean(onA)!==Boolean(onB);
    const room=onA??onB;
    const role=room?.purpose??'';
    // Wet, medical and secure spaces do not receive a shopfront by accident.
    const daylightPriority=['living','dining','bedroom','guest','office',
      'meeting','reception','lobby','waiting','sales','checkout','studio',
      'study','cubicles','break'].includes(role)?3:
      ['kitchen','service','workshop','bay','hallway','staff'].includes(role)?2:
      ['exam','treatment','storage','loading','equipment'].includes(role)?1:0;
    const clear=site.doors.every(d=>dist(p,{x:(d.a.x+d.b.x)/2,
      y:(d.a.y+d.b.y)/2})>68);
    const side=site.entrySide??'south';
    const frontFacing=side==='north'?horizontal&&Math.abs(p.y-minY)<2:
      side==='south'?horizontal&&Math.abs(p.y-maxY)<2:
      side==='west'?vertical&&Math.abs(p.x-minX)<2:
        vertical&&Math.abs(p.x-maxX)<2;
    return {wall,index,horizontal,vertical,length,outside,clear,p,frontFacing,
      room,role,daylightPriority};
  }).filter(x=>x.outside&&x.length>89&&x.clear&&x.room&&x.daylightPriority>0)
    .sort((a,b)=>b.daylightPriority-a.daylightPriority||
      Number(b.frontFacing)-Number(a.frontFacing)||b.length-a.length||a.index-b.index);
  const chosen=new Set<number>(),windows:WindowOpening[]=[];
  const litRooms=new Set<string>();
  for(const item of eligible){
    if(windows.length>=desired)break;
    // A connected room wing may have several facade segments; favor daylight
    // in different rooms rather than a string of identical windows in one.
    if(litRooms.has(item.room!.id))continue;
    const fullHeight=item.frontFacing&&
      ['retail','office','restaurant'].includes(site.archetype??'')&&
      ['sales','checkout','dining','reception','lobby','waiting','meeting'].includes(item.role);
    const half=Math.min(fullHeight?44:26,(item.length-42)/2),
      wall=item.wall,dx=(wall.b.x-wall.a.x)/item.length,
      dy=(wall.b.y-wall.a.y)/item.length;
    const a={x:item.p.x-dx*half,y:item.p.y-dy*half};
    const b={x:item.p.x+dx*half,y:item.p.y+dy*half};
    if(dist(a,wall.a)<20||dist(b,wall.b)<20)continue;
    chosen.add(item.index);
    litRooms.add(item.room!.id);
    const style=fullHeight?'storefront':openingStyle(site.archetype,seed,windows.length);
    const clerestory=style==='clerestory';
    windows.push({id:'W'+windows.length,x:item.p.x,y:item.p.y,
      width:half*2,vertical:item.vertical,style,
      sillHeight:fullHeight?0:clerestory?28:style==='awning'?19:undefined,
      headHeight:fullHeight||clerestory?39:style==='awning'?35:undefined});
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
    low:(opening.sillHeight??14)<25,
    fixture:opening.sillHeight===0?'glass-barrier':'window-sill'});
  const exteriorFixture=site.archetype==='warehouse'?'pallet':
    site.archetype==='garage'?'vehicle':
    site.archetype==='house'?'fence':
    site.archetype==='clinic'?'bench':'vehicle';
  const entrySide=site.entrySide??'south',bounds=site.bounds??
    {minX:0,minY:0,maxX:640,maxY:740};
  const horizontal=entrySide==='south'||entrySide==='north';
  const min=horizontal?minX:minY,max=horizontal?maxX:maxY;
  const near=min+82,far=max-82;
  const lateral=Math.abs(near-(horizontal?site.entrance.x:site.entrance.y))>
    Math.abs(far-(horizontal?site.entrance.x:site.entrance.y))?near:far;
  const x=horizontal?lateral:entrySide==='east'?maxX+79:minX-79;
  const y=horizontal?(entrySide==='south'?maxY+79:minY-79):lateral;
  const frontage:Obstacle={x,y,w:exteriorFixture==='fence'?58:46,
    h:exteriorFixture==='fence'?10:24,
    low:exteriorFixture!=='vehicle',fixture:exteriorFixture};
  // A frontage vehicle/planter must not occupy a real glazed aperture
  // and its sill. Earlier it was added unconditionally after the windows.
  const clearsFacade=cover.every(o=>
    Math.abs(o.x-x)>=(o.w+frontage.w)/2+7||
    Math.abs(o.y-y)>=(o.h+frontage.h)/2+7);
  if(x>bounds.minX+25&&x<bounds.maxX-25&&
    y>bounds.minY+25&&y<bounds.maxY-25&&
    dist({x,y},site.entrance)>80&&clearsFacade)
    cover.push(frontage);
  const glazed=addInteriorGlazing({...site,walls,cover,windows},seed);
  // The public window list is authoritative: each opening gets exactly one
  // matching sill collider, even when interior glazing inserts apertures.
  // Do not stack duplicate sills at the same window or leave orphan cover.
  const sills=(glazed.windows??[]).map(opening=>({
    x:opening.x,y:opening.y,
    w:opening.vertical?10:opening.width,
    h:opening.vertical?opening.width:10,
    low:(opening.sillHeight??14)<25,
    fixture:opening.sillHeight===0?'glass-barrier':'window-sill'
  }));
  const physical={...glazed,cover:[
    ...glazed.cover.filter(obstacle=>
      obstacle.fixture!=='window-sill'&&obstacle.fixture!=='glass-barrier'),
    ...sills
  ]};
  return addSecurityPerimeter(addCoveredEntries(
    addExteriorProperty(physical,seed),seed),seed);
}

/** Gameplay window state never mutates the seed-derived architectural plan. */
export type WindowState=WindowOpening&{
 open:boolean;integrity:number;shattered:boolean;operable:boolean;
};
export function initializeWindows(openings:readonly WindowOpening[]):WindowState[]{
 return openings.map(w=>({...w,open:false,integrity:2,
   shattered:false,operable:!w.interior&&w.width>=38&&
    !['picture','storefront','clerestory','wire'].includes(w.style??'standard')}));
}
export function manipulateWindow(w:WindowState,action:'open'|'close'|'break'){
 if(action==='break'){
  if(w.shattered)return false;
  w.integrity=0;w.shattered=true;w.open=true;return true;
 }
 if(!w.operable||w.shattered||w.open===(action==='open'))return false;
 w.open=action==='open';return true;
}
export function damageWindow(w:WindowState,energy:number):boolean{
 if(w.shattered||energy<=0)return false;
 w.integrity=Math.max(0,w.integrity-energy);
 if(w.integrity===0)manipulateWindow(w,'break');
 return true;
}

/** The pane intersects shots in the actual facade plane; the low sill and
 * frame remain their original authoritative geometry when glass breaks.
 */
export function windowPaneSegment(w:WindowState):Segment{
 const half=w.width/2;
 return w.vertical?{a:{x:w.x,y:w.y-half},b:{x:w.x,y:w.y+half}}:
   {a:{x:w.x-half,y:w.y},b:{x:w.x+half,y:w.y}};
}
