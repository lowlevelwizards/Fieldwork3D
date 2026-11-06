/** Inventory-backed carried magazines reuse the authored family curves. */
import * as THREE from 'three';
import {arMagazineCurve,arMagazineOutline}
 from './weapons/geometry/ar-magazine-profiles.ts';
import {akMagazineCurve,akMagazineOutline}
 from './weapons/geometry/ak-magazine-profiles.ts';
export type CarriedMagProfile={family:'ar'|'ak';length:number;material:number};
export function carriedMagazineProfile(part:string|null|undefined):CarriedMagProfile|null{
 if(!part)return null;
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
