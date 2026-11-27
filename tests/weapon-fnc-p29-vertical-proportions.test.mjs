/** P29: compact receiver/fore-end, straight STANAG housing, lighter open stock. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {arMagazineCurve} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const one=(g,k)=>g.children.find(c=>c.userData[k]);
const all=(g,k)=>g.children.filter(c=>c.userData[k]);
const bb=x=>new THREE.Box3().setFromObject(x);
const size=(x,k)=>bb(x).max[k]-bb(x).min[k];
const close=(a,b,e=.04)=>Math.abs(a-b)<=e;
const tex=(tileCol,tileRow,x,y,bounds)=>{
 const {data,width}=fncPixelAtlas().image,[x0,x1,y0,y1]=bounds;
 const i=tileCol*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=tileRow*128+Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return data[(j*width+i)*4];
};
const cfg=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');

test('P29 A: receiver has slimmer planar crown, seated rear sight and charging slot',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(mat);
 const upper=one(g,'fncFlatStampedUpper'),rear=one(g,'fncP22SolidRearSight'),
  handle=one(g,'fncRightChargingHandle'),lower=one(g,'fncAngularLower');
 assert.ok(upper&&rear&&handle&&lower);
 assert.ok(close(bb(upper).max.y,1.50));
 assert.ok(size(upper,'y')>2.45&&size(upper,'y')<2.65);
 assert.ok(close(bb(upper).max.x,2.75));
 const v=upper.geometry.getAttribute('position');
 const heights=new Set();
 for(let i=0;i<v.count;i++)
  if(close(v.getX(i),2.17,.002))heights.add(v.getY(i).toFixed(2));
 assert.ok(heights.has('0.00')&&heights.has('1.50')&&heights.has('-1.10'),
  'central wall shrinks to 1.10 and planar sloped upper remains');
 assert.ok(close(bb(rear).max.y,2.63));
 assert.ok(bb(rear).intersectsBox(bb(upper)));
 assert.ok(bb(handle).intersectsBox(bb(upper)));
 const slotBounds=[-6.40,2.80,-1.20,1.60];
 assert.ok(tex(0,0,-.4,-.17,slotBounds)<160);
 assert.ok(tex(0,0,1.6,.08,slotBounds)<160);
 assert.equal(tex(0,0,-3,.60,slotBounds),255);
 assert.ok(close(size(upper,'z'),2.78));
 assert.ok(size(lower,'z')>size(upper,'z')+.5);
 clearWeaponSilhouette(g);mat.dispose();
});
test('P29 A: straight nonflared magwell with subtle slanted lip and all STANAGs',()=>{
 const mat=new THREE.MeshBasicMaterial(),R=L.receiver;
 assert.equal(R.magwellFrontX,2.45);
 assert.equal(R.magwellRearX,-1.58);
 assert.equal(R.magazineCenterX,.45);
 assert.ok(R.frontX-R.magwellFrontX>=.29,'visible metal shoulder ahead of mouth');
 assert.ok(close(R.magwellFrontBottomY-R.magwellRearBottomY,.14));
 for(const id of ['ar-mag30','ar-mag20','ar-magpoly','fnc-mag30']){
  const style=id==='ar-mag20'?'20':id==='ar-magpoly'?'poly':'30';
  const g=buildFNCStage1Silhouette(mat,{},true,id);
  const lower=one(g,'fncP22ComfortableSTANAGHousing');
  const mag=one(g,'fncSharedARStanag');
  const upper=one(g,'fncP15FlatReceiverNose');
  const c=arMagazineCurve(style,R.magazineCenterX,R.magazineTopY);
  assert.ok(lower&&mag&&upper);
  assert.ok(c.topX-c.width/2-R.magwellRearX>.30,'rear housing material');
  assert.ok(R.magwellFrontX-(c.topX+c.width/2)>.30,'front housing material');
  assert.ok(bb(lower).intersectsBox(bb(mag)));
  assert.ok(close(bb(lower).max.x,bb(upper).max.x));
  const vertices=lower.geometry.getAttribute('position');
  let frontLip=-Infinity;
  for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<-2.58)
   frontLip=Math.max(frontLip,vertices.getX(i));
  assert.ok(close(frontLip,R.magwellFrontX));
  assert.ok(bb(upper).max.x-frontLip>.28);
  assert.ok(close(bb(lower).min.y,R.magwellRearBottomY));
  assert.ok(close(bb(mag).max.y,R.magazineTopY));
  assert.equal(lower.geometry.getAttribute('position').count,84,
   'one integrated eight-corner shell without added flares');
  clearWeaponSilhouette(g);
 }
 mat.dispose();
});
test('P29 B: polymer and gas vertically slimmer yet remain connected',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(mat);
 const p=one(g,'fncFacetedHandguard'),gas=one(g,'fncP24RearwardLowerGasBlock'),
  stop=one(g,'fncP11HandstopLip'),barrel=one(g,'fncServiceBarrel'),
  ears=all(g,'fncP20SimpleSightEar');
 assert.ok(p&&gas&&stop&&barrel);
 assert.ok(size(p,'y')>=2.54&&size(p,'y')<=2.63);
 assert.ok(size(stop,'y')<3.12,'end collar shrinks with polymer');
 assert.ok(close(bb(gas).max.y,1.50));
 assert.ok(close(bb(gas).min.y,-1.10));
 assert.ok(bb(gas).max.y-bb(p).min.y<3.75);
 assert.ok(bb(gas).intersectsBox(bb(p))&&bb(stop).intersectsBox(bb(p)));
 assert.ok(bb(stop).intersectsBox(bb(gas)));
 assert.ok(bb(barrel).intersectsBox(bb(gas)));
 assert.ok(close((bb(barrel).max.y+bb(barrel).min.y)/2,0));
 assert.ok(bb(barrel).min.y-L.gas.frontBottomY>.45,
  'the bore emerges from low in shortened gas block without opening a void');
 assert.equal(ears.length,2);
 assert.ok(ears.every(x=>bb(x).intersectsBox(bb(gas))));
 assert.ok(ears.every(x=>close(bb(x).max.y,2.42)));
 assert.ok(bb(ears[0]).max.z<bb(ears[1]).min.z||
  bb(ears[1]).max.z<bb(ears[0]).min.z);
 assert.equal(gas.geometry.getAttribute('position').count,216);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(p.userData.fncPixelGroovesPerSide,2);
 clearWeaponSilhouette(g);mat.dispose();
});
test('P29 B: revised atlas encodes grooves, gas vents and front detail on faces',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(mat);
 for(const region of ['receiver-upper','receiver-lower','polymer','gas']){
  const mesh=g.children.find(x=>x.userData.fncPixelDetailRegion===region);
  assert.ok(mesh,region);
  assert.equal(mesh.material.map,fncPixelAtlas());
  assert.equal(mesh.geometry.getAttribute('uv').count,
   mesh.geometry.getAttribute('position').count);
 }
 const b=[L.gas.startX,L.gas.endX,L.gas.frontBottomY,L.gas.topY];
 for(let k=0;k<4;k++){
  const x=L.gas.ventFirstX+k*L.gas.ventPitch+.5;
  assert.equal(tex(3,0,x,L.gas.ventSideYs[0],b),114);
  assert.equal(tex(0,1,x,0,[L.gas.startX,L.gas.endX,
   -L.gas.roofHalfZ,L.gas.roofHalfZ]),114);
 }
 for(const line of L.gas.lowerLines)
  assert.equal(tex(3,0,(line.startX+line.endX)/2,line.y,b),line.shade);
 const y=v=>{
  const P=L.polymer,yy=P.pivotY+(v-P.pivotY)*P.heightScale+P.liftY;
  return yy+Math.min(0,yy+1)*P.lowerFlare;
 };
 for(const groove of L.polymer.grooveYs)
  assert.equal(tex(1,1,7,y(groove),[L.polymer.startX,L.polymer.endX,-2.80,.70]),154);
 clearWeaponSilhouette(g);mat.dispose();
});
test('P29 C: stock has slimmer rails/pad but full open connected frame',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(mat);
 const pad=one(g,'fncButtPlate'),top=one(g,'fncP10ContinuousBareUpperRail'),
  low=one(g,'fncKinkedLowerRail'),web=one(g,'fncP10LongThinConnector'),
  hinge=one(g,'fncP23TallerStockHinge');
 assert.ok(pad&&top&&low&&web&&hinge);
 assert.ok(size(pad,'x')>=.65&&size(pad,'x')<=.70);
 assert.ok(close(bb(pad).min.x,FNC_P1.stockRearX));
 assert.ok(size(top,'y')<1.10&&size(top,'y')>.98);
 assert.ok(size(low,'z')<1.03&&size(top,'z')<1.01);
 assert.ok(bb(pad).intersectsBox(bb(top))&&bb(pad).intersectsBox(bb(low)));
 assert.ok(bb(top).intersectsBox(bb(hinge))&&bb(low).intersectsBox(bb(hinge)));
 assert.ok(bb(web).intersectsBox(bb(top))&&bb(web).intersectsBox(bb(low)));
 assert.ok(bb(top).min.y>bb(low).max.y+.12,
  'open frame negative space remains visible');
 clearWeaponSilhouette(g);mat.dispose();
});
test('P29 integration: contacts, muzzle and peer triangle budget unchanged',()=>{
 const m=new THREE.MeshBasicMaterial(),config=cfg(),g=buildWeaponSilhouette('rifle',m,m,config);
 const audit=countGeometry(g),peers=buildAuditReport();
 assert.equal(audit.triangles,536);
 assert.equal(audit.meshes,23);
 for(const [name,tri] of [['FAL',366],['M4A1',462]])
  assert.equal(peers.find(x=>x.name===name).triangles,tri);
 assert.ok(close(bb(g).min.x,FNC_P1.stockRearX));
 assert.ok(close(bb(g).max.x,FNC_P1.muzzleX));
 const pose=riflePoseContacts('rifle',config);
 assert.ok(pose&&pose.support.near.x>=L.polymer.fullStartX);
 assert.ok(pose.support.far.x<L.polymer.endX-.6);
 assert.ok(pose.support.near.y>bb(one(g,'fncFacetedHandguard')).min.y&&
  pose.support.near.y<bb(one(g,'fncFacetedHandguard')).max.y);
 assert.equal(resolveWeaponAssembly(config).muzzleY,0);
 assert.equal(resolveWeaponAssembly(config).muzzleX,19.50);
 const suppressed={...config,slots:{...config.slots,muzzle:'muzzle-suppressor'}};
 const s=buildWeaponSilhouette('rifle',m,m,suppressed);
 assert.ok(!one(s,'fncMuzzle'));
 assert.ok(close(bb(s).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(s);clearWeaponSilhouette(g);m.dispose();
});
