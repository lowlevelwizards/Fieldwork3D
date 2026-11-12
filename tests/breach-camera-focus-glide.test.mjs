import test from 'node:test';
import assert from 'node:assert/strict';
import {stepCameraFocusGlide} from '../src/breach-camera-focus-glide.ts';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const simulate=(step,seconds,origin={x:-240,y:600},target={x:350,y:80})=>{
 let p={...origin},v={x:0,y:0};
 for(let n=0;n<Math.round(seconds/step);n++){
  const next=stepCameraFocusGlide(p,target,v,step);
  p=next.point;v=next.velocity;
 }
 return {point:p,velocity:v};
};
test('camera starts gently, settles without overshoot, and respects frame rate',()=>{
 const start={x:-240,y:600},target={x:350,y:80},v={x:0,y:0};
 const first=stepCameraFocusGlide(start,target,v,1/60);
 assert.ok(first.point.x>start.x&&first.point.x<target.x);
 assert.ok(first.point.y<start.y&&first.point.y>target.y);
 const short=simulate(1/60,.2);
 const long=simulate(1/60,.5);
 const distance=p=>Math.hypot(p.x-target.x,p.y-target.y);
 assert.ok(distance(short.point)<distance(start));
 assert.ok(distance(long.point)<distance(short.point)*.12);
 const a=simulate(1/60,.4).point,b=simulate(1/30,.4).point;
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01,'frame-rate independent motion');
});
test('camera retargets mid-flight without snapping back to the previous target',()=>{
 let point={x:0,y:0},velocity={x:0,y:0};
 const firstTarget={x:500,y:250};
 for(let i=0;i<8;i++){
  const next=stepCameraFocusGlide(point,firstTarget,velocity,1/60);
  point=next.point;velocity=next.velocity;
 }
 const before={...point};
 const next=stepCameraFocusGlide(point,{x:250,y:-180},velocity,1/60);
 assert.ok(Math.hypot(next.point.x-before.x,next.point.y-before.y)<50);
 assert.ok(Number.isFinite(next.velocity.x));
});
test('camera damping stays presentation-only and cancels on direct controls',()=>{
 const scene=source('breach-3d.ts'),main=source('breach-main.ts');
 const loop=source('breach-runtime-loop.ts');
 assert.match(scene,/glideFocusOn\(point:Pt,instant=false\)/);
 assert.match(scene,/cancelFocusGlide\(\)/);
 assert.match(scene,/panBetween\([\s\S]*?this\.cancelFocusGlide\(\)/);
 assert.match(scene,/zoomAt\([\s\S]*?this\.cancelFocusGlide\(\)/);
 assert.match(main,/stage\.glideFocusOn\(point,reducedMotionMedia\.matches\)/);
 assert.match(main,/advance2DCameraGlide\(dt\)/);
 assert.match(main,/cancel2DCameraGlide\(\)/);
 assert.match(loop,/config\.renderFrame\(dt\)/);
});
