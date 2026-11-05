import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x5d594b});
const parts=g=>g.children[0].geometry.userData.cuboids;
test('R5 shemagh retains a large chest drape in four thick readable tiers',()=>{
 const scarf=createD2FabricWrap('shemagh',cloth);
 assert.deepEqual(scarf.children.map(g=>g.userData.d2WrapMode),
  ['draped','face-wrap','head-wrap']);
 for(const mode of scarf.children){
  const c=parts(mode),names=c.map(x=>x.name);
  assert.equal(mode.children.length,1);
  const bib=c.filter(x=>x.name.startsWith('broad-triangular-chest-bib-'));
  assert.equal(bib.length,4);
  assert.ok(bib.every(x=>x.height>1.1&&x.depth>=.70),
   'use few heavy cloth masses instead of thin voxel steps');
  assert.ok(names.includes('right-hanging-scarf-tail'));
  assert.ok(names.includes('left-tucked-shoulder'));
  assert.ok(names.filter(x=>x.includes('fold')).length>=2);
  const box=new THREE.Box3().setFromObject(mode);
  assert.ok(box.min.y< -7.1);
  assert.ok(box.max.x>4.5);
 }
});
test('R5 diagonal face folds are coarse and crown rear is genuinely closed',()=>{
 const modes=createD2FabricWrap('shemagh',cloth).children;
 const draped=parts(modes[0]),face=parts(modes[1]),head=parts(modes[2]);
 assert.equal(draped.filter(p=>p.name.startsWith('diagonal-face-wrap-')).length,0);
 for(const c of [face,head]){
  const folds=c.filter(p=>p.name.startsWith('diagonal-face-wrap-'));
  assert.equal(folds.length,3);
  assert.ok(folds.every(p=>p.height>1.20&&p.depth>=.60));
 }
 assert.ok(head.some(p=>p.name==='second-crown-winding'));
 assert.ok(head.some(p=>p.name==='long-rear-head-wrap-tail'));
 assert.ok(!head.some(p=>p.name.includes('hood-front')||p.name.includes('balaclava')));
 const size=new THREE.Box3().setFromObject(modes[2]);
 assert.ok(size.max.y>7.3);
 const rear=head.find(p=>p.name==='continuous-rear-closure');
 const cap=head.find(p=>p.name==='draped-crown-top');
 const crown=head.filter(p=>p.name==='crown-rear-band');
 assert.ok(rear&&rear.width>8.5&&rear.depth>.8);
 assert.equal(crown.length,2);
 assert.ok(crown[0].x+crown[0].width/2>
  crown[1].x-crown[1].width/2,'rear bands overlap across center seam');
 for(const band of crown){
  assert.ok(band.y+band.height/2 > cap.y-cap.height/2,
   'rear band must physically overlap crown top, not leave upper slit');
  assert.ok(band.y-band.height/2 < rear.y+rear.height/2,
   'rear band must overlap lower closure');
 }
 const cheek=head.find(p=>p.name==='wraparound-rear');
 assert.ok(cheek.y+cheek.height/2>rear.y-rear.height/2,
  'rear closure joins existing lower face-wrap');
 // Sample the rear midline through eye level and crown, where the thin R4
 // exposed slit appeared. An authored rear sheet must cover every sample.
 for(let y=0;y<=7.25;y+=.20)
  assert.ok(head.some(p=>p.x-p.width/2<=0&&p.x+p.width/2>=0&&
    p.y-p.height/2<=y&&p.y+p.height/2>=y&&
    p.z-p.depth/2<4.18&&p.z+p.depth/2>4.18),
   'closed rear midline at Y '+y.toFixed(2));
});
