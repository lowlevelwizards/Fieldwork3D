import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,passable} from '../src/breach-core.ts';
import {registerSessionWorldGeometry} from '../src/breach-world-context.ts';
import {glideAlongStaticWall,releaseStaticWallOverlap}
 from '../src/breach-navigation.ts';

const p=(x,y)=>({x,y});
const rand=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
test('P2.12 indexed static walls preserve old wall-glide and overlap release outcomes',()=>{
 const random=rand(2112);
 const walls=[
  {a:p(150,18),b:p(150,545)},
  {a:p(280,100),b:p(450,100)},
  ...Array.from({length:130},()=>({
   a:p(20+random()*520,20+random()*520),
   b:p(20+random()*520,20+random()*520)
  }))
 ];
 const cover=[{x:350,y:325,w:26,h:33,fixture:'desk'}];
 const site={seed:2112,name:'WALL BROADPHASE',layout:'test',
  walls,cover,bounds:{minX:0,minY:0,maxX:600,maxY:600}};
 activateSite(site);
 try{
  const s={site,coverState:cover,objectRevision:0};
  const world=registerSessionWorldGeometry(s);
  const door=[];
  const fixtures=[
   {from:p(143,210),to:p(151,216),goal:p(190,210)},
   {from:p(152,255),to:p(158,266),goal:p(210,255)},
   ...Array.from({length:180},()=>({
    from:p(20+random()*525,20+random()*525),
    to:p(20+random()*525,20+random()*525),
    goal:p(20+random()*525,20+random()*525)
   }))
  ];
  for(const {from,to,goal} of fixtures){
   assert.deepEqual(glideAlongStaticWall(from,to,door,world),
    glideAlongStaticWall(from,to,door),
    'glide parity '+JSON.stringify({from,to}));
   assert.deepEqual(releaseStaticWallOverlap(from,goal,door,1.3,world),
    releaseStaticWallOverlap(from,goal,door,1.3),
    'overlap parity '+JSON.stringify({from,goal}));
  }
  // World geometry revision invalidates the same authoritative index;
  // deliberately retain the old global comparison for unchanged walls.
  s.objectRevision++;
  const from=p(143,210),goal=p(210,210);
  assert.deepEqual(releaseStaticWallOverlap(from,goal,door,1.3,world),
   releaseStaticWallOverlap(from,goal,door,1.3));
 }finally{activateSite(null);}
});
test('P2.12 near-wall broadphase examines fewer walls while preserving ordered tie decisions',()=>{
 const random=rand(8281);
 const walls=[{a:p(90,40),b:p(90,290)},
  ...Array.from({length:165},(_,i)=>({
   a:p(420+random()*150,360+random()*150),
   b:p(420+random()*150,360+random()*150)
  }))];
 const site={seed:8281,walls,cover:[],
  bounds:{minX:0,minY:0,maxX:700,maxY:700}};
 activateSite(site);
 try{
  const world=registerSessionWorldGeometry({
   site,coverState:site.cover,objectRevision:0
  });
  let visited=0;
  const observed={...world,someWallNearPoint:(at,r,match)=>
   world.someWallNearPoint(at,r,(wall,index)=>{
    visited++;return match(wall,index);
   })
  };
  const from=p(83,125),to=p(87,139);
  const expected=glideAlongStaticWall(from,to,[],world);
  const actual=glideAlongStaticWall(from,to,[],observed);
  assert.deepEqual(actual,expected);
  assert.ok(visited<walls.length/3,
   'only local static walls should enter the costly glide examination: '+visited);
 }finally{activateSite(null);}
});
