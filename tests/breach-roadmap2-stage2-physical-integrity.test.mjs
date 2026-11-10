/** Roadmap 2 Stage 2: physical contracts exercise final, furnished maps
 * using authoritative footprint collision and pathfinding, not a visual grid.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {doorLeafSegment,activateSite,activeSite,WALLS,COVER}
 from '../src/breach-core.ts';
import {auditSitePhysicalIntegrity}
 from '../src/worldgen/site-physical-integrity.ts';
import {auditTacticalMobility}
 from '../src/worldgen/tactical-mobility-audit.ts';
import {circulationReservations,overlapsCirculationReservation}
 from '../src/worldgen/circulation-reservations.ts';

const has=(report,code,entity)=>report.blocking.some(f=>
 f.code===code&&(!entity||f.entity===entity));
const swing=(report,door)=>report.warnings.some(f=>
 f.code==='blocked-swing'&&f.entity===door);

test('all eleven building programs have finite, traversable physical sites',()=>{
 const types=new Set();
 // One full 11-archetype circuit is a critical gate; the larger four-
 // orientation/three-size matrix lives in the deliberate soak audit.
 for(let seed=11;seed<22;seed++){
  const site=generateSite(seed,'small');
  const snapshot=structuredClone(site);
  const audit=auditSitePhysicalIntegrity(site);
  types.add(audit.archetype);
  const affected=audit.blocking.filter(issue=>issue.code==='unreachable-room');
  const topology=affected.map(issue=>{
   const room=site.rooms.find(r=>r.id===issue.entity);
   const touches=portal=>{
    const m={x:(portal.a.x+portal.b.x)/2,y:(portal.a.y+portal.b.y)/2};
    return room&&m.x>=room.x-.1&&m.x<=room.x+room.w+.1&&
      m.y>=room.y-.1&&m.y<=room.y+room.h+.1;
   };
   return {room,doors:site.doors.filter(touches),
    openings:(site.openings??[]).filter(touches),
    nearbyCover:site.cover.filter(o=>site.doors.some(d=>touches(d)&&
      Math.hypot(o.x-(d.a.x+d.b.x)/2,o.y-(d.a.y+d.b.y)/2)<95))
      .map(o=>({fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h})),
    cover:site.cover.filter(o=>room&&o.x>=room.x&&o.x<=room.x+room.w&&
      o.y>=room.y&&o.y<=room.y+room.h).map(o=>({
       fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h
      }))};
  });
  assert.equal(audit.blocking.length,0,
   'seed '+seed+' ('+audit.archetype+'): '+
    JSON.stringify({issues:audit.blocking,topology,mobility:auditTacticalMobility(site),allDoors:site.doors}));
  assert.equal(audit.checkedRooms,
   site.rooms.filter(r=>r.kind==='room').length);
  assert.equal(audit.checkedDoors,site.doors.length);
  assert.equal(audit.checkedPositions,
   site.spawn.length+site.enemies.length+2);
  assert.deepEqual(site,snapshot,'audit must be read-only: '+seed);
 }
 assert.equal(types.size,11,'missing an archetype from matrix');
});

test('default-scale townhouse, apartment, and office room clusters are reachable',()=>{
 const failures=[];
 for(const seed of [1,2,35,37]){
  const site=generateSite(seed,'standard');
  const audit=auditSitePhysicalIntegrity(site);
  const broken=audit.blocking.filter(f=>f.code==='unreachable-room');
  if(!broken.length)continue;
  const details=broken.slice(0,4).map(issue=>{
   const r=site.rooms.find(room=>room.id===issue.entity);
   if(!r)return {id:issue.entity};
   const mid=portal=>({x:(portal.a.x+portal.b.x)/2,
    y:(portal.a.y+portal.b.y)/2});
   const adjacent=other=>other!==r&&(
    Math.abs(other.x-r.x-r.w)<.1||Math.abs(r.x-other.x-other.w)<.1?
      Math.min(other.y+other.h,r.y+r.h)>Math.max(other.y,r.y)+24:
    (Math.abs(other.y-r.y-r.h)<.1||Math.abs(r.y-other.y-other.h)<.1)&&
      Math.min(other.x+other.w,r.x+r.w)>Math.max(other.x,r.x)+24);
   const near=p=>p.x>=r.x-1&&p.x<=r.x+r.w+1&&
    p.y>=r.y-1&&p.y<=r.y+r.h+1;
   return {room:r,neighbors:site.rooms.filter(adjacent).map(q=>({
     id:q.id,purpose:q.purpose,unitId:q.unitId,zoneId:q.zoneId,
     x:q.x,y:q.y,w:q.w,h:q.h,
     cover:site.cover.filter(o=>o.x>q.x-14&&o.x<q.x+q.w+14&&
       o.y>q.y-14&&o.y<q.y+q.h+14).map(o=>({
         fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h
       }))
   })),portals:[...site.doors,...(site.openings??[])]
    .filter(d=>near(mid(d))).map(d=>({id:d.id,a:d.a,b:d.b})),
    cover:site.cover.filter(o=>o.x>=r.x-22&&o.x<=r.x+r.w+22&&
      o.y>=r.y-22&&o.y<=r.y+r.h+22)
     .map(o=>({fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h}))
   };
  });
  failures.push({seed,archetype:site.archetype,
   rooms:broken.map(f=>f.entity),details,
   allRooms:site.rooms.map(r=>({id:r.id,kind:r.kind,purpose:r.purpose,
     zoneId:r.zoneId,x:r.x,y:r.y,w:r.w,h:r.h})),
   allPortals:[...site.doors,...(site.openings??[])].map(d=>({
     id:d.id,a:d.a,b:d.b
   })),spawn:site.spawn[0]});
 }
 assert.equal(failures.length,0,JSON.stringify(failures));
});

test('fixed office partitions preserve open-plan operator corridors',()=>{
 const site=generateSite(37,'standard');
 const lanes=circulationReservations(site).filter(l=>
  l.kind==='through-route'&&
  site.rooms.some(r=>r.id===l.roomId&&r.purpose==='cubicles'));
 assert.ok(lanes.length,'office must reserve its open-plan cubicle passages');
 for(const [i,o] of site.cover.entries()){
  if(o.fixture!=='half-wall')continue;
  const room=site.rooms.find(r=>r.purpose==='cubicles'&&
   o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h);
  if(!room)continue;
  assert.equal(overlapsCirculationReservation(o,lanes,room.id),false,
   'fixed half-wall '+i+' cannot block cubicle circulation in '+room.id);
 }
});

test('large professional office wings must connect all functional rooms',()=>{
 for(const seed of [15,37]){
  const site=generateSite(seed,'large');
  const audit=auditSitePhysicalIntegrity(site);
  const unreachable=audit.blocking.filter(i=>i.code==='unreachable-room');
  const evidence=unreachable.map(issue=>{
   const room=site.rooms.find(r=>r.id===issue.entity);
   if(!room)return {id:issue.entity};
   const nearby=(p,d=10)=>p.x>=room.x-d&&p.x<=room.x+room.w+d&&
     p.y>=room.y-d&&p.y<=room.y+room.h+d;
   const touches=(portal)=>{
    const p={x:(portal.a.x+portal.b.x)/2,y:(portal.a.y+portal.b.y)/2};
    return nearby(p,1);
   };
   return {room,
    portals:[...site.doors.filter(touches),...(site.openings??[]).filter(touches)],
    nearbyCover:site.cover.filter(o=>nearby(o,95)).map(o=>({
      x:o.x,y:o.y,w:o.w,h:o.h,fixture:o.fixture
    }))
   };
  });
  assert.equal(unreachable.length,0,
   'office seed '+seed+' disconnected: '+JSON.stringify({unreachable,evidence}));
 }
});

test('identity, geometry, and physical obstruction have independent failures',()=>{
 const site=generateSite(7,'small');
 const front=site.doors.find(d=>d.id==='FRONT');
 assert.ok(front);
 const wall={a:{...front.a},b:{...front.b}};
 const walled={...site,walls:[...site.walls,wall]};
 const blocked=auditSitePhysicalIntegrity(walled);
 assert.ok(has(blocked,'blocked-portal','FRONT'),
  'a visually present door cannot hide a solid wall');
 const invalid={...site,cover:[...site.cover,
  {x:site.objective.x,y:site.objective.y,w:25,h:25,fixture:'fridge'}]};
 assert.ok(has(auditSitePhysicalIntegrity(invalid),'invalid-position','objective'),
  'an objective located inside fixed furniture is not reachable');
 const malformed={...site,cover:[...site.cover,
  {x:100,y:100,w:-4,h:12,fixture:'chair'}]};
 assert.ok(has(auditSitePhysicalIntegrity(malformed),'invalid-geometry'));
 const duplicate={...site,doors:[...site.doors,{...front}]};
 assert.ok(has(auditSitePhysicalIntegrity(duplicate),'duplicate-door','FRONT'));
});

test('independent solid fixtures cannot overlap without a named diagnostic',()=>{
 const site=generateSite(6,'small');
 const first={x:site.objective.x+80,y:site.objective.y+80,
  w:40,h:24,fixture:'desk'};
 const second={...first,x:first.x+5,fixture:'workbench'};
 const broken={...site,cover:[...site.cover,first,second]};
 const audit=auditSitePhysicalIntegrity(broken);
 assert.ok(audit.warnings.some(f=>f.code==='furniture-overlap'&&
  f.entity==='cover:'+(broken.cover.length-2)+'+'+(broken.cover.length-1)),
  'two physical furniture footprints must be reported with source indices');
 assert.ok(!auditSitePhysicalIntegrity(site).warnings.some(f=>
  f.code==='furniture-overlap'&&f.entity===audit.warnings.at(-1)?.entity),
  'the injected overlap must not be attributed to the original site');
});

test('window appearance requires matching authoritative physical collider',()=>{
 const site=generateSite(8,'small');
 assert.ok(site.windows?.length,'sample must actually contain windows');
 const window=site.windows[0];
 const fixture=window.sillHeight===0?'glass-barrier':'window-sill';
 const broken={...site,cover:site.cover.filter(o=>
  !(o.fixture===fixture&&Math.hypot(o.x-window.x,o.y-window.y)<1))};
 assert.ok(has(auditSitePhysicalIntegrity(broken),
  'missing-window-collider',window.id));
});

test('real swept leaf detects desk obstructing early swing, without moving it',()=>{
 const site=generateSite(9,'small');
 const door=site.doors.find(d=>!d.kind||d.kind==='hinged');
 assert.ok(door);
 const leaf=doorLeafSegment({...door,open:true,openFraction:.35});
 const desk={x:leaf.a.x+(leaf.b.x-leaf.a.x)*.77,
  y:leaf.a.y+(leaf.b.y-leaf.a.y)*.77,w:8,h:8,fixture:'desk'};
 const jammed={...site,cover:[...site.cover,desk]};
 const baseline=structuredClone(jammed);
 assert.ok(swing(auditSitePhysicalIntegrity(jammed),door.id),
  'partial furniture-interrupted door is diagnostic, not silently ignored');
 assert.deepEqual(jammed,baseline,'no moving/deleting essential furniture');
});

test('squeeze channels are kept distinct from impossible blocked flow',()=>{
 const door={id:'CHECK',a:{x:100,y:100},b:{x:140,y:100},
  open:false,openedAt:-1,kind:'hinged'};
 const empty={doors:[door],walls:[],cover:[],
  bounds:{minX:0,minY:0,maxX:320,maxY:320}};
 assert.equal(auditTacticalMobility(empty).blockedFlow,0);
 const obstructed={...empty,cover:[{
  x:120,y:142,w:70,h:45,fixture:'fridge'
 }]};
 const metrics=auditTacticalMobility(obstructed);
 assert.ok(metrics.blockedFlow+metrics.tightApproaches+
  metrics.blockedApproaches>0,
  'a clear-looking threshold can still have no continuous approach');
});

test('offline deep audit restores displaced live mission geometry exactly',()=>{
 const active=generateSite(5,'small');
 activateSite(active);
 try{
  COVER.splice(0,1,{...COVER[0],x:COVER[0].x+19});
  const beforeWalls=[...WALLS],beforeCover=[...COVER];
  const other=generateSite(17,'small');
  const first=auditSitePhysicalIntegrity(other);
  const second=auditSitePhysicalIntegrity(other);
  assert.deepEqual(second,first,'diagnostic outcomes must be deterministic');
  assert.equal(activeSite(),active,'active mission identity must survive');
  assert.deepEqual(WALLS,beforeWalls,'world walls must survive');
  assert.deepEqual(COVER,beforeCover,'live displaced furniture must survive');
 }finally{activateSite(null);}
});
