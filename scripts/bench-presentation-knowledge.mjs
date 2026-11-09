/** Reproducible opt-in desktop CPU probe. NOT a phone FPS or GPU timer.
 * The renderer uses knowledge-only predicates; this demonstrates the
 * avoidable cost of evaluating complete LOS states for boolean gating.
 */
import {performance} from 'node:perf_hooks';
import {newSession} from '../src/breach-game.ts';
import {WALLS,COVER,activateSite} from '../src/breach-core.ts';
import {spatialSurfaceKnown,spatialSurfaceState}
  from '../src/breach-presentation.ts';

const s=newSession(0,4419,'floor-plan','large');
s.intel.mode='floor-plan';
for(let i=0;i<WALLS.length;i++)s.intel.walls.add(i);
for(let i=0;i<COVER.length;i++)s.intel.cover.add(i);
for(const door of s.doors)s.intel.doors.add(door.id);
for(const room of s.site?.rooms??[])s.intel.rooms.add(room.id);
const cases=[
 ...WALLS.slice(0,100).map((_,i)=>['wall',i]),
 ...COVER.slice(0,100).map((_,i)=>['cover',i]),
 ...s.doors.slice(0,50).map(d=>['door',d.id]),
 ...(s.site?.rooms??[]).slice(0,50).map(r=>['room',r.id]),
];
function measure(fn){
 for(let i=0;i<3;i++)for(const [kind,key] of cases)fn(kind,key);
 const start=performance.now();let known=0;
 for(let i=0;i<10;i++)for(const [kind,key] of cases)
   if(fn(kind,key))known++;
 return {milliseconds:+(performance.now()-start).toFixed(2),known};
}
const full=measure((kind,key)=>spatialSurfaceState(s,kind,key)!=='unknown');
const direct=measure((kind,key)=>spatialSurfaceKnown(s,kind,key));
if(full.known!==direct.known)throw Error('Knowledge parity regression');
console.log(JSON.stringify({
  seed:s.site?.seed,probes:cases.length,iterations:10,
  fullClassificationMs:full.milliseconds,
  knowledgeOnlyMs:direct.milliseconds,
  parity:true,note:'Node CPU timings; not measured iPhone FPS'
},null,2));
activateSite(null);
