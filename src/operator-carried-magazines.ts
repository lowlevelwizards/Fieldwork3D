/** Inventory-backed carried magazines reuse the authored family curves. */
import * as THREE from 'three';
import {arMagazineCurve,arMagazineOutline}
 from './weapons/geometry/ar-magazine-profiles.ts';
import {akMagazineCurve,akMagazineOutline}
 from './weapons/geometry/ak-magazine-profiles.ts';
import {HK_MAG20_OUTLINE,HK_MAG20_CENTER_X,HK_MAG20_TOP_Y,HK_MAG20_LENGTH}
 from './weapons/geometry/hk-magazine-profiles.ts';
import {HK556_MAG_CENTER_X,HK556_MAG_TOP_Y,HK556_MAG_LENGTHS,
 hk556MagazineOutline,type HK556MagazineId}
 from './weapons/geometry/hk-556-magazine-profiles.ts';
import {MP5_MAG_CENTER_X,MP5_MAG_TOP_Y,MP5_MAG_LENGTH,mp5MagazineOutline}
 from './weapons/geometry/hk-mp5-magazine-profiles.ts';
export type CarriedMagProfile={family:'ar'|'ak'|'hk';length:number;material:number};
export function carriedMagazineProfile(part:string|null|undefined):CarriedMagProfile|null{
 if(!part)return null;
 if(part==='hk-g3-mag20')
  return {family:'hk',length:HK_MAG20_LENGTH,material:0x5e6960};
 if(part==='hk9-mag30')
  return {family:'hk',length:MP5_MAG_LENGTH,material:0x515b53};
 if(part==='hk556-mag25'||part==='hk556-mag30')
  return {family:'hk',length:HK556_MAG_LENGTHS[part],material:0x515b53};
 if(part.startsWith('ar-mag'))
  return {family:'ar',length:part==='ar-mag20'?4.1:5.3,
   material:part==='ar-magpoly'?0x343e37:0x687369};
 if(part.startsWith('ak-mag')||part.startsWith('ak-rpk-mag')){
  const extended=part.startsWith('ak-rpk-mag');
  const heavy=part.startsWith('ak-mag762');
  const plum=part.endsWith('-plum')||part.includes('poly-plum');
  const resin=part==='ak-mag545'||part==='ak-mag762-resin'||extended;
  return {family:'ak',length:extended?8.25:heavy?6.05:5.55,
   material:plum?0x4e3b4c:resin?0x8d5939:
    part.includes('poly')?0x354038:0x454b43};
 }
 return null;
}
export function carriedMagazineGeometry(part:string):THREE.BufferGeometry|null{
 const profile=carriedMagazineProfile(part);
 if(!profile)return null;
 if(profile.family==='hk'){
  const is556=part==='hk556-mag25'||part==='hk556-mag30',is9=part==='hk9-mag30';
  const points=is9?mp5MagazineOutline():
   is556?hk556MagazineOutline(part as HK556MagazineId):HK_MAG20_OUTLINE;
  const center=is9?MP5_MAG_CENTER_X:is556?HK556_MAG_CENTER_X:HK_MAG20_CENTER_X;
  const topY=is9?MP5_MAG_TOP_Y:is556?HK556_MAG_TOP_Y:HK_MAG20_TOP_Y;
  const depth=is9?1.42:is556?1.90:2.08;
  const shape=new THREE.Shape();
  shape.moveTo(points[0][0],points[0][1]);
  for(const [x,y] of points.slice(1))shape.lineTo(x,y);
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,
   bevelEnabled:false,curveSegments:1});
  geometry.translate(-center,-topY+profile.length*.5,-depth*.5);
  geometry.scale(.62,Math.min(.82,4/profile.length),.73);
  geometry.rotateY(Math.PI/2);
  return geometry;
 }
 const ar=profile.family==='ar';
 const curve=ar?
  arMagazineCurve(part==='ar-mag20'?'20':part==='ar-magpoly'?'poly':'30'):
  akMagazineCurve(part.startsWith('ak-rpk')?'rpk45':
   part.startsWith('ak-mag762')?'762':'545');
 const points=ar?
  arMagazineOutline(curve as ReturnType<typeof arMagazineCurve>):
  akMagazineOutline(curve as ReturnType<typeof akMagazineCurve>);
 const shape=new THREE.Shape();
 shape.moveTo(points[0][0],points[0][1]);
 for(const [x,y] of points.slice(1))shape.lineTo(x,y);
 shape.closePath();
 const depth=ar?1.83:2.2;
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,
  bevelEnabled:false,curveSegments:1});
 // Face the curved silhouette toward the viewer instead of projecting
 // magazine width out through the carrier's front plate.
 geometry.translate(-curve.topX,-curve.topY+profile.length*.5,-depth*.5);
 geometry.scale(.62,Math.min(.82,4/profile.length),.73);
 geometry.rotateY(Math.PI/2);
 return geometry;
}
