/** Read-only generated-hinge clearance survey (D3.13C).
 * No map mutation, opening, forced physics, seed selection or runtime hooks.
 * Evaluate the actual 72% traversability arc against each map's OWN walls and
 * furnished cover, not whatever other global site is currently active.
 */
import {generateSite} from '../src/breach-site.ts';
import {initDoor,doorSwingBlocked} from '../src/breach-door.ts';
import {OPERATOR_RADIUS} from '../src/breach-core.ts';
const types=['house','townhouse','apartment','retail','office',
 'garage','warehouse','restaurant','motel','utility','clinic'];
const N=Number(process.argv[2]??22);
const base=Number(process.argv[3]??1200201);
const stride=Number(process.argv[4]??9311);
const rows=[];
for(let i=0;i<N;i++){
 const seed=base+i*stride,type=types[i%types.length],
  scale=i<types.length?'small':'standard';
 const site=generateSite(seed,scale,undefined,
  {enableIncidentIntent:false,enemyCount:0,civilianCount:0},
  {archetype:type});
 // The clearance function uses exactly site/walls/cover/revision.
 const world={site,walls:site.walls,cover:site.cover,revision:0};
 const doors=site.doors.map((src,index)=>{
  const d=initDoor(src,index);
  if(d.kind==='sliding'||d.kind==='shutter')return null;
  const original=doorSwingBlocked(d,.72,[],OPERATOR_RADIUS,world);
  const alternate=doorSwingBlocked({...d,swing:d.swing===1?-1:1},
   .72,[],OPERATOR_RADIUS,world);
  const initial=doorSwingBlocked(d,.32,[],OPERATOR_RADIUS,world);
  return {id:d.id,kind:d.kind??'hinged',hinge:d.hinge,swing:d.swing,
   width:Math.hypot(d.a.x-d.b.x,d.a.y-d.b.y),
   initialBlocked:initial,
   expectedCrossingBlocked:original,oppositeBlocked:alternate,
   hingeA:d.a,hingeB:d.b};
 }).filter(Boolean);
 rows.push({seed,type,scale,doors});
}
const all=rows.flatMap(r=>r.doors.map(d=>({...d,seed:r.seed,type:r.type,scale:r.scale})));
const stats={maps:rows.length,hinges:all.length,
 blockedAt32:all.filter(d=>d.initialBlocked).length,
 blockedAt72:all.filter(d=>d.expectedCrossingBlocked).length,
 reversible:all.filter(d=>d.expectedCrossingBlocked&&!d.oppositeBlocked).length,
 bothBlocked:all.filter(d=>d.expectedCrossingBlocked&&d.oppositeBlocked).length,
 affectedMaps:new Set(all.filter(d=>d.expectedCrossingBlocked).map(d=>d.seed)).size,
 blockedAfter32:all.filter(d=>!d.initialBlocked&&d.expectedCrossingBlocked).length
};
console.log('HINGE_AUDIT '+JSON.stringify({stats,affected:all.filter(d=>d.expectedCrossingBlocked)}));
if(rows.length!==N||all.length===0)throw Error('incomplete hinge survey');
