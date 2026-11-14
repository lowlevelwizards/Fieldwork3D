import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,planSquadEntry,team} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,activateSite}
 from '../src/breach-core.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {entryLanes} from '../src/breach-entry-lanes.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const names=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];

// Directly test lane retry behavior without constructing a live simulation.
// The chosen position must satisfy the final full-body stance predicate,
// even when a near-wall alternative fits the much smaller squeeze capsule.
test('D3.10A entry lanes search for alternate full-size legal endpoints',()=>{
 const door={id:'D',a:{x:100,y:100},b:{x:100,y:142},
   hinge:'a',swing:1,kind:'hinged',open:false,openFraction:0};
 let visited=0;
 const lanes=entryLanes(door,{x:130,y:120},4,p=>{
   visited++;
   // Simulate an interior room that cannot fit a full body in the
   // first lateral candidate but accepts the more central alternatives.
   return p.x<54&&p.y>60&&p.y<180&&
     Math.abs(p.y-120)>7;
 });
 assert.ok(visited>4,'attempt alternate positions rather than using a blocked slot');
 for(const lane of lanes)assert.ok(lane.point.x<54);
 assert.equal(lanes.length,4);
});

test('D3.10A actual full-view generated ENTRY destinations are standing-safe',()=>{
 let accepted=0,failed=0;
 for(let index=0;index<names.length;index++){
  const seed=31032+index*13;
  const site=generateSite(seed,index%2===0?'small':'standard',
    undefined,{mission:'intel'},{archetype:names[index]});
  const quiet={...site,training:true,enemies:[],encounter:undefined};
  const s=newSession(0,seed,'full-view',site.scale??'small','intel',quiet,
    {enableCivilians:false});
  try{
   const squad=team(s).slice(0,4);
   assert.equal(squad.length,4);
   const origin=squad[0].p;
   const doors=[...s.doors].filter(door=>door.kind!=='sliding'&&
       door.kind!=='shutter').sort((a,b)=>
       distance(origin,{x:(a.a.x+a.b.x)/2,y:(a.a.y+a.b.y)/2})-
       distance(origin,{x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2})||
       a.id.localeCompare(b.id)).slice(0,12);
   const world=sessionWorldGeometry(s);
   let selected=null;
   for(const door of doors){
    const snapshot=squad.map(a=>a.plan.map(node=>node.id));
    if(planSquadEntry(s,door.id)){selected=door;break;}
    // A failure must not leave a half-authored synchronized team.
    for(let i=0;i<squad.length;i++)
     assert.deepEqual(squad[i].plan.map(n=>n.id),snapshot[i],
       seed+'/'+door.id+' mutated plans after rejection');
   }
   if(!selected){failed++;continue;}
   accepted++;
   const goals=squad.map(a=>{
    const node=a.plan.find(n=>n.kind==='move'&&
      n.entryDoorId===selected.id);
    assert.ok(node,seed+'/'+a.id+' missing generated landing');
    assert.ok(intelPassable(node.p,s.intel,OPERATOR_RADIUS),
      seed+'/'+a.id+' known geometry blocks landing');
    assert.ok(world.passable(node.p,OPERATOR_RADIUS),
      seed+'/'+a.id+' physical static geometry blocks landing');
    assert.ok(pointToSegment(node.p,doorLeafSegment(selected))>=
      OPERATOR_RADIUS+1,
      seed+'/'+a.id+' endpoint collides with current door leaf');
    return node.p;
   });
   for(let i=0;i<goals.length;i++)
    for(let j=0;j<i;j++)
     assert.ok(distance(goals[i],goals[j])>=23,
       seed+' generated two overlapping entry destinations');
  }finally{activateSite(null);}
 }
 assert.ok(accepted>0,'no generated ENTRY templates were accepted');
 console.log('D3.10A preflight:',JSON.stringify({accepted,failed,
   attempts:names.length}));
});

test('D3.10A planning uses full body, without changing authored MOVE goals',async()=>{
 const {readFileSync}=await import('node:fs');
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const block=game.slice(game.indexOf('export function planSquadEntry'),
   game.indexOf('/** Tactical WAIT:',game.indexOf('export function planSquadEntry')));
 assert.match(block,/intelPassable\(p,s\.intel,OPERATOR_RADIUS\)/);
 assert.match(block,/pointToSegment\(p,knownLeaf\)<OPERATOR_RADIUS\+1/);
 assert.match(block,/routeWithSqueezeIntel\(s\.intel,start,p\)/);
 assert.doesNotMatch(block,/sessionWorldGeometry\(s\)/);
});
