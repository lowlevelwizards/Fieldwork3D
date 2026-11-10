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
