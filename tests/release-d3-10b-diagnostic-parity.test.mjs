import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,pointToSegment,doorLeafSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {isFootstepObstacle} from '../src/breach-traversal-surfaces.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function reference(from,to,doors,actors,radius,world){
 const n=Math.max(1,Math.ceil(dist(from,to)/3.5)),bounds=world.bounds;
 for(let i=1;i<=n;i++){
  const f=i/n,p={x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};
  const result=(blocker,id)=>({blocker,point:p,distance:dist(from,p),
   ...(id?{id}:{})});
  if(p.x<bounds.minX+13||p.y<bounds.minY+20||
     p.x>bounds.maxX-13||p.y>bounds.maxY-13)return result('bounds');
  if(world.walls.some(w=>pointToSegment(p,w)<radius+1))
   return result('wall');
  if(world.cover.some(o=>isFootstepObstacle(o)&&
   Math.abs(p.x-o.x)<o.w/2+radius&&Math.abs(p.y-o.y)<o.h/2+radius))
   return result('furniture');
  const blocked=doors.find(d=>pointToSegment(p,doorLeafSegment(d))<radius+1);
  if(blocked)return result('door',blocked.id);
  if(actors.some(a=>dist(p,a)<radius*2))return result('actor');
 }
 return {blocker:'clear',point:{...to},distance:dist(from,to)};
}
test('B5 indexed full-body diagnostic exactly matches prior linear scan',()=>{
 let compared=0;
 for(const [index,archetype] of ['retail','warehouse','motel','utility'].entries()){
  const seed=31084+index*13;
  const site=generateSite(seed,index%2?'standard':'small',undefined,
   {mission:'intel'},{archetype});
  const s=newSession(0,seed,'full-view',site.scale??'small','intel',
   {...site,training:true,enemies:[],encounter:undefined},
   {enableCivilians:false});
  try{
   const world=sessionWorldGeometry(s),bounds=world.bounds;
   for(let i=0;i<75;i++){
    const from={x:bounds.minX+13+(i*43.7)%(bounds.maxX-bounds.minX-26),
     y:bounds.minY+20+(i*31.9)%(bounds.maxY-bounds.minY-33)};
    const to={x:from.x+Math.cos(i*1.33)*Math.min(100,14+i),
     y:from.y+Math.sin(i*1.33)*Math.min(100,14+i)};
    const actors=i%4?[{x:from.x+12,y:from.y+4}]:[];
    const expected=reference(from,to,s.doors,actors,OPERATOR_RADIUS,world);
    const actual=diagnoseMovement(from,to,s.doors,actors,OPERATOR_RADIUS,world);
    assert.deepEqual(actual,expected,archetype+' seed '+seed+' route '+i);
    compared++;
   }
  }finally{activateSite(null);}
 }
 assert.equal(compared,300);
});
