import test from 'node:test';
import assert from 'node:assert/strict';
import {pointToSegment,doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {routeWithNormalWorld,recoverNormalLane} from '../src/breach-squeeze-route.ts';

function door(id,x,y,kind='hinged'){
 return {id,kind,a:{x,y},b:{x:x+32,y},open:true,
   openFraction:.83,hinge:'a',swing:-1,slideDirection:1};
}
function legacyStand(doors,world){
 // Freeze the exact original worldCanStand predicate as an independent oracle.
 return (p,r)=>world.passable(p,r)&&!doors.some(d=>
   d.open&&(d.openFraction??0)>=.72&&
   pointToSegment(p,doorLeafSegment(d))<r+1);
}
function worldFor(barriers=[]){
 return {passable(p,r=OPERATOR_RADIUS){
  if(p.x<r+10||p.y<r+10||p.x>250-r||p.y>225-r)return false;
  return !barriers.some(b=>p.x>b.x0-r&&p.x<b.x1+r&&
    p.y>b.y0-r&&p.y<b.y1+r);
 }};
}
test('P2.10 all full-body routes preserve legacy live-leaf clearance across door states',()=>{
 const barriers=[{x0:89,x1:115,y0:75,y1:140}];
 const cases=[
  {from:{x:32,y:42},to:{x:186,y:55}},
  {from:{x:32,y:100},to:{x:196,y:183}},
  {from:{x:28,y:172},to:{x:207,y:42}},
  {from:{x:165,y:183},to:{x:42,y:45}}
 ];
 const doors=[door('hinge',112,46),door('slide',160,120,'sliding'),
  door('shutter',43,152,'shutter'),
  ...Array.from({length:18},(_,i)=>door('remote-'+i,400+i*50,500))];
 const world=worldFor(barriers);
 for(const fraction of [0,.35,.72,.93]){
  doors[0].openFraction=fraction;
  doors[0].hinge=fraction>.7?'b':'a';
  doors[1].openFraction=fraction;
  doors[1].slideDirection=fraction>.5?-1:1;
  doors[2].openFraction=fraction;
  for(const {from,to} of cases){
   const expected=routeWithNormalWorld(from,to,doors,world,
     legacyStand(doors,world));
   const actual=routeWithNormalWorld(from,to,doors,world);
   assert.deepEqual(actual,expected,
    'same route, door fraction '+fraction+', from '+JSON.stringify(from));
  }
 }
});
test('P2.10 door geometry is sampled per search rather than per A* vertex',()=>{
 let getterCalls=0;
 const far=door('far',680,680);
 Object.defineProperty(far,'openFraction',{
  get(){getterCalls++;return .94;}
 });
 const doors=[far];
 const world=worldFor([{x0:95,x1:118,y0:77,y1:120}]);
 const from={x:40,y:92},to={x:198,y:92};
 const expected=routeWithNormalWorld(from,to,doors,world,
  legacyStand(doors,world));
 const previousGetterCalls=getterCalls;getterCalls=0;
 const actual=routeWithNormalWorld(from,to,doors,world);
 const newGetterCalls=getterCalls;
 assert.deepEqual(actual,expected);
 assert.ok(previousGetterCalls>newGetterCalls*3,
  'far door should not re-evaluate hinge for every A* candidate: '+
  previousGetterCalls+' vs '+newGetterCalls);
});
test('P2.10 blocked goal returns before all thirteen redundant recovery attempts',()=>{
 let checks=0;
 const world={passable(p,r=OPERATOR_RADIUS){
  checks++;
  return p.x<100-r&&p.y>10+r&&p.y<190-r;
 }};
 const from={x:34,y:90},to={x:160,y:90};
 const actual=recoverNormalLane(from,to,[],world);
 assert.deepEqual(actual,[]);
 assert.equal(checks,1,
  'all onward routes require the exact same unstandable full-body endpoint');
});
