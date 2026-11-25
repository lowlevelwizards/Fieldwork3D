import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planWallTrimPackets,compileWallTrimGeometry,compileUnifiedWallGeometry,restrictWallShadowToBody,installWallShadowBounds,resolveWallStructureMode} from '../src/rendering/wall-structural-packet.ts';
import {wallTrimSwatchUV} from '../src/rendering/wall-surface-atlas.ts';
import {planWallCapJoins} from '../src/rendering/wall-cap-joins.ts';
import {groupWallPresentation,resolveWallPresentation,applyWallMaterialState} from '../src/rendering/breach-wall-presentation.ts';
const wall=(x,y,u,v)=>({a:{x,y},b:{x:u,y:v}});
const walls=[wall(0,0,80,0),wall(80,0,80,60),wall(40,0,40,-50),wall(80,60,120,90),wall(120,90,123,90)];
const slot={row:0,texture:{image:{width:128,height:256}}};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,a+' != '+b);
test('packet plan preserves original trim and connector ownership, including short segments',()=>{
 const joins=planWallCapJoins(walls),packets=planWallTrimPackets(walls,56,0xd1c9b4,0x4c5250,joins);
 assert.equal(packets.length,walls.length);
 assert.equal(packets.flatMap(p=>p.parts.filter(x=>x.kind==='joint')).length,joins.junctions.length);
 for(const [index,p] of packets.entries()){
  const w=walls[index],len=Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y);
  if(len<5){assert.ok(p.parts.every(x=>x.kind==='joint'));continue;}
  const foot=p.parts.find(x=>x.kind==='skirting'),cap=p.parts.find(x=>x.kind==='cap');
  assert.deepEqual([foot.width,foot.height,foot.depth,foot.y],[len,4,12,2]);
  assert.deepEqual([cap.width,cap.height,cap.depth,cap.y],[Math.max(1,len-joins.trims[index][0]-joins.trims[index][1]),2,11,56.3]);
  assert.equal(cap.yaw,-Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x));
 }
 for(const joint of joins.junctions)assert.ok(packets[joint.owner].parts.some(p=>p.kind==='joint'&&p.x===joint.p.x&&p.z===joint.p.y));
});
test('compiled trim retains every indexed triangle, local position, normal and linear palette',()=>{
 for(const packet of planWallTrimPackets(walls,56,0xd1c9b4,0x4c5250)){
  const g=compileWallTrimGeometry(packet);
  if(!packet.parts.length){assert.equal(g,null);continue;}
  assert.equal(g.index.count,packet.parts.length*36);assert.equal(g.groups.length,0);
  const pos=g.getAttribute('position'),normal=g.getAttribute('normal'),color=g.getAttribute('color');
  assert.equal(pos.count,packet.parts.length*24);
  for(const [i,part] of packet.parts.entries()){
   const reference=new THREE.BoxGeometry(part.width,part.height,part.depth);
   reference.rotateY(part.yaw);reference.translate(part.x-packet.mid.x,part.y,part.z-packet.mid.y);
   const rp=reference.getAttribute('position'),rn=reference.getAttribute('normal'),c=new THREE.Color(part.color);
   for(let j=0;j<24;j++){
    const k=i*24+j;
    close(pos.getX(k),rp.getX(j));close(pos.getY(k),rp.getY(j));close(pos.getZ(k),rp.getZ(j));
    close(normal.getX(k),rn.getX(j));close(normal.getY(k),rn.getY(j));close(normal.getZ(k),rn.getZ(j));
    close(color.getX(k),c.r);close(color.getY(k),c.g);close(color.getZ(k),c.b);
   }
   for(let j=0;j<36;j++)assert.equal(g.index.getX(i*36+j),reference.index.getX(j)+24*i);
   reference.dispose();
  }
  g.dispose();
 }
});
test('trim packet shares owner presentation but not materials across independent walls',()=>{
 const pieces=planWallTrimPackets(walls.slice(0,2),56,0xffffff,0x333333).flatMap(p=>{
  const body=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
  const trim=new THREE.Mesh(compileWallTrimGeometry(p),new THREE.MeshStandardMaterial({vertexColors:true}));
  body.castShadow=true;trim.castShadow=false;
  return [body,trim].map(mesh=>({mesh,index:p.index,segment:walls[p.index],exterior:true}));
 });
 const owners=groupWallPresentation(pieces);
 for(const m of owners[0].pieces)applyWallMaterialState(m.material,resolveWallPresentation(1,true,1,false,false,false,true));
 assert.ok(owners[0].pieces.every(m=>m.material.opacity<.995&&!m.material.depthWrite));
 assert.ok(owners[1].pieces.every(m=>m.material.opacity===1&&m.material.depthWrite));
 assert.ok(owners.every(o=>o.pieces[0].castShadow&&!o.pieces[1].castShadow));
 for(const p of pieces){p.mesh.geometry.dispose();p.mesh.material.dispose();}
});

test('unified packet retains body vertices and uses only its original indices for shadow submission',()=>{
 const body=new THREE.BoxGeometry(80,56,9),packet=planWallTrimPackets(walls,56,0xffffff,0x333333)[0];
 const result=compileUnifiedWallGeometry(body,packet,0,56,slot),g=result.geometry;
 assert.equal(result.shadowIndexCount,body.index.count);
 assert.equal(g.index.count,body.index.count+packet.parts.length*36);
 assert.equal(g.groups.length,0);
 assert.deepEqual(g.getAttribute('position').array.slice(0,72),body.getAttribute('position').array);
 assert.deepEqual(g.getAttribute('uv').array.slice(0,48),body.getAttribute('uv').array);
 assert.equal(g.getAttribute('color'),undefined);
 for(const [partIndex,part] of packet.parts.entries()){
  const [u,v]=wallTrimSwatchUV(slot,part.kind==='skirting'?'trim':'cap');
  for(let i=24+partIndex*24;i<48+partIndex*24;i++){assert.equal(g.getAttribute('uv').getX(i),u);assert.equal(g.getAttribute('uv').getY(i),v);}
 }
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());
 restrictWallShadowToBody(m,result.shadowIndexCount);
 m.onBeforeShadow();assert.equal(g.drawRange.count,36);
 m.onAfterShadow();assert.equal(g.drawRange.count,g.index.count);
 m.onBeforeShadow();m.onBeforeRender();assert.equal(g.drawRange.count,g.index.count);
 body.dispose();g.dispose();m.material.dispose();
});

test('shadow culling temporarily restores body sphere and restores full bounds on throw',()=>{
 const body=new THREE.BoxGeometry(80,56,9),packet=planWallTrimPackets(walls,56,0xffffff,0x333333)[0];
 const result=compileUnifiedWallGeometry(body,packet,0,56,slot),m=new THREE.Mesh(result.geometry,new THREE.MeshStandardMaterial());m.castShadow=true;
 restrictWallShadowToBody(m,result.shadowIndexCount,result.bodySphere);
 const full=m.geometry.boundingSphere;let fail=false,expected=result.bodySphere;
 const map={enabled:true,autoUpdate:false,needsUpdate:true,render(){assert.equal(m.geometry.boundingSphere,expected);if(fail){m.onBeforeShadow();throw Error('probe');}}};
 installWallShadowBounds(map,()=>[{mesh:m}]);map.render();assert.equal(m.geometry.boundingSphere,full);
 fail=true;assert.throws(()=>map.render(),/probe/);assert.equal(m.geometry.boundingSphere,full);assert.equal(m.geometry.drawRange.count,m.geometry.index.count);
 fail=false;map.needsUpdate=false;expected=full;map.render();body.dispose();m.geometry.dispose();m.material.dispose();
});

test('production uses unified structural walls unless an explicit comparison is selected',()=>{
 for(const mode of [null,'','unified','unknown','0'])assert.equal(resolveWallStructureMode(mode),'unified');
 assert.equal(resolveWallStructureMode('separate'),'separate');
 assert.equal(resolveWallStructureMode('compiled'),'compiled');
});
