/** Bounded second pass that actually attempts missing essential fixtures.
 * Searches all rectangles of a connected zone; does not invent furniture,
 * shrink assets, ignore door clearances or claim unsatisfied rooms are complete.
 * Optional decor may be displaced to guarantee previously missing essentials.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {ROOM_CONTRACTS} from './room-contracts.ts';
import {fixtureServiceClear,requiresServiceApproach} from './fixture-service-clearance.ts';
type Input=Pick<Site,'rooms'|'doors'|'openings'|'spawn'|'enemies'|'objective'|'extract'>;
export type RecoveryIssue={roomId:string;fixture:string;reason:string};
const inside=(o:Obstacle,r:Room)=>o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h;
const collides=(a:Obstacle,b:Obstacle)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+5&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+5;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function candidates(room:Room,width:number,depth:number):Pt[]{
 const l=room.x+width/2+9,r=room.x+room.w-width/2-9,
       t=room.y+depth/2+9,b=room.y+room.h-depth/2-9;
 if(l>r||t>b)return [];
 const points:Pt[]=[];
 const dx=Math.max(1,Math.ceil((r-l)/15)),dy=Math.max(1,Math.ceil((b-t)/15));
 for(let y=0;y<=dy;y++)for(let x=0;x<=dx;x++)
  points.push({x:l+(r-l)*x/dx,y:t+(b-t)*y/dy});
 // Prioritize room walls, preserving the most usable central circulation.
 points.sort((a,c)=>{
  const edge=(p:Pt)=>Math.min(p.x-l,r-p.x,p.y-t,b-p.y);
  return edge(a)-edge(c)||a.y-c.y||a.x-c.x;
 });
 return points;
}
function recoverPass(site:Input,initial:readonly Obstacle[],
  strategy:'original'|'constrained'):{
 cover:Obstacle[];issues:RecoveryIssue[];recovered:number
}{
 const cover=[...initial],issues:RecoveryIssue[]=[];
 const groups=new Map<string,Room[]>();
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const id=room.zoneId??room.id;
  groups.set(id,[...(groups.get(id)??[]),room]);
 }
 const reserved=[...site.spawn,...site.enemies,site.objective,site.extract];
 let recovered=0;
 for(const [zone,rooms] of groups){
  const role=rooms[0]?.purpose??'storage';
  const contract=ROOM_CONTRACTS[role];if(!contract)continue;
  const requirementOrder=[...contract.required];
  if(strategy==='constrained'){
   // Re-home the most difficult/largest real equipment first; a shower
   // cannot be fitted into the last corner after small fittings have spread.
   const difficulty=(group:readonly string[])=>{
    const sizes=group.map(propDefinition).filter(
      (a):a is NonNullable<typeof a>=>!!a?.solid);
    const viable=sizes.filter(a=>rooms.some(r=>
      a.width<=r.w-18&&a.depth<=r.h-18));
    return {options:viable.length*rooms.length,
      area:Math.max(0,...viable.map(a=>a.width*a.depth))};
   };
   requirementOrder.sort((a,b)=>{
    const aa=difficulty(a),bb=difficulty(b);
    return aa.options-bb.options||bb.area-aa.area;
   });
  }
  for(const alternatives of requirementOrder){
   if(cover.some(o=>alternatives.includes(o.fixture??'')&&rooms.some(r=>inside(o,r))))continue;
   let chosen:Obstacle|undefined,displaced:Obstacle[]=[];
   // First seek genuinely empty positions. Reclaim one or two optional
   // pieces only when no collision-free position exists anywhere in the zone.
   // This prevents a decorative dresser from making a kitchen sink impossible.
   const optional=new Set([...contract.expected,...contract.optional]);
   for(const evictionBudget of [0,1,2]){
    for(const fixture of alternatives){
     const asset=propDefinition(fixture);
     if(!asset?.solid)continue;
     for(const room of rooms){
      if(asset.width>room.w-18||asset.depth>room.h-18)continue;
      const spots=candidates(room,asset.width,asset.depth);
      for(const pos of spots){
       const candidate:Obstacle={...pos,w:asset.width,h:asset.depth,
        fixture,low:asset.cover==='low'};
       if(reserved.some(p=>Math.abs(p.x-pos.x)<asset.width/2+23&&
         Math.abs(p.y-pos.y)<asset.depth/2+23))continue;
       if(site.doors.some(d=>distance(pos,{x:(d.a.x+d.b.x)/2,
         y:(d.a.y+d.b.y)/2})<Math.max(37,Math.max(asset.width,asset.depth)/2+20)))continue;
       if((site.openings??[]).some(o=>distance(pos,{x:(o.a.x+o.b.x)/2,
         y:(o.a.y+o.b.y)/2})<Math.max(44,Math.max(asset.width,asset.depth)/2+22)))continue;
       const colliding=cover.filter(o=>collides(o,candidate));
       if(colliding.length>evictionBudget)continue;
       if(colliding.some(o=>!optional.has(o.fixture??'')||
         !rooms.some(r=>inside(o,r))))continue;
       // No already-satisfied required group may become unsatisfied.
       if(contract.required.some(group=>{
        const before=cover.some(o=>group.includes(o.fixture??'')&&
          rooms.some(r=>inside(o,r)));
        const after=cover.some(o=>!colliding.includes(o)&&
          group.includes(o.fixture??'')&&rooms.some(r=>inside(o,r)))||
          group.includes(fixture);
        return before&&!after;
       }))continue;
       // A required fixture is not functional merely because its body fits.
       // Test all four working directions against the actual oriented shape.
       // Keep already-usable working faces usable when introducing a new prop.
       const retained=cover.filter(o=>!colliding.includes(o));
       const turns:readonly (0|1|2|3)[]=requiresServiceApproach(fixture)?[0,1,2,3]:[0];
       const turn=turns.find(orientation=>{
        const w=orientation%2===0?asset.width:asset.depth;
        const h=orientation%2===0?asset.depth:asset.width;
        const placed={...candidate,w,h,orientation};
        if(pos.x-w/2<room.x+9||pos.x+w/2>room.x+room.w-9||
          pos.y-h/2<room.y+9||pos.y+h/2>room.y+room.h-9)return false;
        if(retained.some(o=>collides(o,placed)))return false;
        if(!fixtureServiceClear(room,placed,retained))return false;
        const withPlaced=[...retained,placed];
        return retained.every(existing=>{
         if(!requiresServiceApproach(existing.fixture)||!inside(existing,room)||
            !fixtureServiceClear(room,existing,retained))return true;
         return fixtureServiceClear(room,existing,withPlaced);
        });
       });
       if(turn===undefined)continue;
       chosen=requiresServiceApproach(fixture)?
         {...candidate,orientation:turn}:candidate;
       displaced=colliding;break;
      }
      if(chosen)break;
     }
     if(chosen)break;
    }
    if(chosen)break;
   }
   if(chosen){
    for(const item of displaced)cover.splice(cover.indexOf(item),1);
    cover.push(chosen);recovered++;
   }else issues.push({roomId:zone,fixture:alternatives.join('|'),
     reason:'essential-unresolved'});
  }
 }
 return {cover,issues,recovered};
}

/** A second, bounded attempt may re-home the room's existing ordinary
 * fixtures, rather than allowing their first corner placements to obstruct
 * the remaining required pieces. Only adopt a strictly better COMPLETE
 * contract count; otherwise keep the original geometry without churn.
 * Structural barriers, damaged items and other zones are never removed.
 */
export function recoverRoomEssentials(site:Input,initial:readonly Obstacle[]):{
 cover:Obstacle[];issues:RecoveryIssue[];recovered:number
}{
 const first=recoverPass(site,initial,'original');
 if(!first.issues.length)return first;
 const failing=new Set(first.issues.map(issue=>issue.roomId));
 const stripped=initial.filter(obstacle=>{
  if(!obstacle.fixture||obstacle.integrity!==undefined||
    obstacle.material!==undefined)return true;
  const room=site.rooms.find(r=>r.kind==='room'&&
    failing.has(r.zoneId??r.id)&&inside(obstacle,r));
  if(!room)return true;
  const required=ROOM_CONTRACTS[room.purpose??'']?.required??[];
  return !required.some(group=>group.includes(obstacle.fixture!));
 });
 if(stripped.length===initial.length)return first;
 const alternative=recoverPass(site,stripped,'constrained');
 return alternative.issues.length<first.issues.length?alternative:first;
}
