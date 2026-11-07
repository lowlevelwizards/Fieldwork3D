import test from 'node:test';
import assert from 'node:assert/strict';
import {groundMarkOccludedFromCamera}
 from '../src/breach-ground-geometry.ts';
import {probeWindowPortalRoute}
 from '../src/breach-mantle.ts';
import {incomingHitFacing,chooseMuzzleRecoveryStep}
 from '../src/breach-combat-reactions.ts';

const line=(a,b)=>({a,b});
test('3D blood behind faded opaque wall does not X-ray through cutaways',()=>{
 const mark={x:0,y:0},view={x:0,y:.8,z:-.6};
 const foreground=line({x:-90,y:-10},{x:90,y:-10});
 assert.equal(groundMarkOccludedFromCamera(mark,view,[foreground]),true);
 const behind=line({x:-90,y:10},{x:90,y:10});
 assert.equal(groundMarkOccludedFromCamera(mark,view,[behind]),false);
 const windowGap=[line({x:-90,y:-10},{x:-20,y:-10}),
  line({x:20,y:-10},{x:90,y:-10})];
 assert.equal(groundMarkOccludedFromCamera(mark,view,windowGap),false);
 assert.equal(groundMarkOccludedFromCamera(mark,{x:0,y:1,z:0},
  [foreground]),false);
 assert.equal(groundMarkOccludedFromCamera(mark,view,
  [foreground],5),false,'camera ray passes over short structure');
});

test('shattered interior windows are legal portals without direct-line alignment',()=>{
 const sill={x:0,y:0,w:10,h:64,low:true,fixture:'window-sill'};
 const window={id:'IW0',x:0,y:0,width:64,vertical:true,
  interior:true,style:'picture',sillHeight:13,headHeight:49,
  open:true,integrity:0,shattered:true,operable:false};
 const walls=[
  line({x:0,y:-110},{x:0,y:-32}),
  line({x:0,y:32},{x:0,y:110})];
 const from={x:-80,y:-43},to={x:90,y:44};
 const route=(a,b)=>[b];
 const world={cover:[sill],walls,doors:[],windows:[window],
  canStand:at=>Math.abs(at.x)>12};
 const chosen=probeWindowPortalRoute(from,to,world,route);
 assert.ok(chosen,'indirect cross-window route must be discovered');
 assert.equal(chosen.crossing.kind,'climb-window');
 assert.equal(chosen.crossing.windowId,'IW0');
 assert.deepEqual(chosen.crossing.approach,{x:-17,y:0});
 assert.deepEqual(chosen.crossing.landing,{x:17,y:0});
 assert.deepEqual(chosen.exitPath,[to]);
 assert.ok(chosen.duration>chosen.crossing.duration);
 assert.equal(probeWindowPortalRoute(from,to,{...world,windows:[{
  ...window,open:false,shattered:false}]},route),null);
 assert.equal(probeWindowPortalRoute(from,to,{...world,windows:[{
  ...window,treatment:'bars'}]},route),null);
});

test('only an actual recent incoming hit temporarily wins over authored gaze',()=>{
 const source=incomingHitFacing(0,-Math.PI/2,.35);
 assert.ok(source!==null&&Math.abs(source-Math.PI/2)<1e-6);
 assert.equal(incomingHitFacing(0,-Math.PI/2,.08),null);
 assert.equal(incomingHitFacing(0,-Math.PI/2,1.6),null);
 assert.equal(incomingHitFacing(0,-Math.PI/2,.35,{busy:true}),null);
 assert.equal(incomingHitFacing(0,Math.PI,.35),null);
});

test('gunblocked operators only step back when motion and shot are safe',()=>{
 const p={x:0,y:0};
 const move=at=>at.x< -11;
 const muzzle=at=>at.x<=-20;
 const backward=chooseMuzzleRecoveryStep(p,0,move,muzzle);
 assert.ok(backward&&Math.abs(backward.x+22)<1e-8&&Math.abs(backward.y)<1e-8);
 assert.equal(chooseMuzzleRecoveryStep(p,0,()=>false,()=>true),null);
 assert.equal(chooseMuzzleRecoveryStep(p,0,()=>true,()=>false),null);
});
