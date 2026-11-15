/** FN FNC P10 shared Arsenal/Workbench/operator silhouette.
 * The stock uses one continuous bare upper beam, a kinked lower bar,
 * a thin extended inset plate, compact rectangular hinge and dark butt pad.
 * No cheek sleeve or trigger guard. Visual geometry builds on demand only.
 * +X muzzle, +Y up, +Z right.
 */
import * as THREE from 'three';
import {buildFNCrownMesh} from './fn-crowned-shell.ts';
import {addOutline,addCuboid,addBar} from './profile-primitives.ts';
import type {SlotName,Outline} from './profile-primitives.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines}
 from './ar-magazine-profiles.ts';
import {addFNCFacetedForearm,addFNCHandstopLip,addFNCForearmMarks,addFNCUpperGasBox}
 from './fnc-handguard-profiles.ts';

export const FNC_P1=Object.freeze({
 stockRearX:-14.85,receiverRearX:-6.38,receiverFrontX:4.12,
 handguardStartX:3.45,handguardEndX:13.55,
 frontSightX:15.20,muzzleX:19.50,magazineBottomY:-7.80,
 nominalBarrelInches:17.7
});
type Finish='steel'|'lower'|'stock'|'buttpad'|'grip'|'handguard'|
 'magazine'|'stamp'|'barrel'|'muzzle'|'shadow';
export type FNCArtFinishes=Readonly<Partial<Record<Finish,THREE.Material>>>;

export function buildFNCStage1Silhouette(
 material:THREE.Material,finishes:FNCArtFinishes={},showFactoryMuzzle=true
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p12-tight-fore-end-fieldwork-exterior';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const mat=(role:Finish)=>finishes[role]??material;
 const p=(slot:SlotName,points:Outline,depth:number,role:Finish='steel')=>
  addOutline(root,slot,'fnc-p5-'+slot,ids[slot]++,points,depth,mat(role));
 const b=(slot:SlotName,x:number,y:number,z:number,
  w:number,h:number,d:number,role:Finish='steel')=>
  addCuboid(root,slot,'fnc-p5-'+slot,ids[slot]++,x,y,z,w,h,d,mat(role));
 const rail=(a:readonly [number,number],end:readonly [number,number],
  width:number,role:Finish='stock')=>{
  const mesh=addBar(root,'stock','fnc-p5-stock',ids.stock++,
   a,end,width,1.04,mat(role));
  mesh.userData.fncStockRail=true;
  return mesh;
 };
 const aperture=(slot:SlotName,name:string,
   outer:readonly (readonly [number,number])[],
   inner:readonly (readonly [number,number])[],
   depth:number,role:Finish='steel')=>{
  const shape=new THREE.Shape();
  shape.moveTo(outer[0][0],outer[0][1]);
  for(let i=1;i<outer.length;i++)shape.lineTo(outer[i][0],outer[i][1]);
  shape.closePath();
  const opening=new THREE.Path();
  // Trace an opposite winding to form a real negative-space opening.
  opening.moveTo(inner[0][0],inner[0][1]);
  for(let i=1;i<inner.length;i++)opening.lineTo(inner[i][0],inner[i][1]);
  opening.closePath();shape.holes.push(opening);
  const geometry=new THREE.ExtrudeGeometry(shape,{
   depth,bevelEnabled:false,steps:1,curveSegments:1
  });
  geometry.translate(0,0,-depth/2);
  const mesh=new THREE.Mesh(geometry,mat(role));
  mesh.name='family-'+slot+'-fnc-p5-'+name+'-'+ids[slot]++;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  return mesh;
 };
 // Two true *3D* width levels. The upper uses FAL-style broad
 // tapered shoulders; it is visibly slimmer at its roof and even at its
 // side walls than the lower body. Not just a narrower front-side polygon.
 const crownedUpper=()=>{
  const stations=[
   {x:-6.38,top:1.46,bottom:-.99,side:1.34,roof:.67},
   {x:-5.59,top:1.60,bottom:-.99,side:1.34,roof:.67},
   {x:2.17,top:1.60,bottom:-.99,side:1.34,roof:.67},
   {x:3.20,top:.45,bottom:-.99,side:1.24,roof:.66}
  ] as const;
  const mesh=buildFNCrownMesh(stations.map(s=>({
   x:s.x,top:s.top,bottom:s.bottom,
   sideHalfZ:s.side,roofHalfZ:s.roof
  })),mat('steel'),{
   shoulderY:s=>Math.max(s.bottom+.48,s.top-1.20),
   capCenterY:(_,end)=>end==='rear'?0:-.30
  });
  mesh.name='family-receiver-fnc-p5-crowned-upper-'+ids.receiver++;
  mesh.userData.fncFlatStampedUpper=true;
  mesh.userData.fncP5CrownedReceiver=true;
  mesh.userData.fncP5RoofHalfWidth=.67;
  mesh.userData.fncP5UpperSideHalfWidth=1.34;
  mesh.userData.fncP6OutwardReceiverEndcaps=true;
  mesh.userData.fncP6ShortenedReceiverFrontX=3.20;
  mesh.userData.fncP7ReceiverLength=9.58;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  return mesh;
 };
 // Remove the oversized rear cheek sleeve entirely. A continuous
 // metal-colored top rail replaces BOTH old segments, avoiding a gap,
 // doubled faces or additional draw calls.
 const top=rail([-6.45,.03],[-14.26,-.04],.84);
 top.userData.fncP9UpperMetalRail=true;
 top.userData.fncP10ContinuousBareUpperRail=true;
 // Lower rail stays parallel for over three art units; at x=-10.18 its
 // single angular knee descends toward the lower butt connection.
 // A single six-vertex extrusion avoids separate, z-fighting bar joins.
 const lowerRail=p('stock',[
  [-6.52,-1.23],[-10.18,-1.23],[-14.38,-3.01],
  [-14.38,-3.49],[-10.05,-1.84],[-6.52,-1.84]
 ],1.12,'stock');
 lowerRail.userData.fncStockRail=true;
 lowerRail.userData.fncKinkedLowerRail=true;
 lowerRail.userData.fncP8StraightStockBrace=true;
 lowerRail.userData.fncP9ParallelThenAngled=true;
 // Slightly longer in X, taller in Y and shallower in Z than P9,
 // still visibly sturdier than either structural rail.
 const hinge=p('stock',[
  [-7.48,.53],[-5.96,.53],[-5.96,-2.10],[-7.48,-2.10]
 ],1.68,'stock');
 hinge.userData.fncStockHinge=true;
 hinge.userData.fncP9BlockHinge=true;
 hinge.userData.fncP10RefinedHinge=true;
 // The same six-point butt profile keeps the original length and vertical
 // silhouette, but gains depth and the former cheek pad's dark finish.
 const pad=p('stock',[
  [-14.85,.36],[-14.17,.36],[-14.10,.12],
  [-14.10,-3.36],[-14.35,-3.56],[-14.85,-3.56]
 ],2.18,'buttpad');
 pad.userData.fncP8NarrowButtplate=true;
 pad.userData.fncButtPlate=true;
 pad.userData.fncP9ConnectedButtplate=true;
 pad.userData.fncP10DarkThickButtpad=true;
 // Lengthen the inset joining plate in X while reducing its Z depth.
 // Intersections with the continuous upper bar and angled lower bar remain
 // deliberate; it is still a flat plate, not a solid stock sidewall.
 const web=p('stock',[
  [-12.95,-.34],[-10.39,-.34],[-11.72,-2.30],[-12.37,-2.66]
 ],.64,'stock');
 web.userData.fncP5StockMiddleBrace=true;
 web.userData.fncP6BoldStockWeb=true;
 web.userData.fncP7StockWeb=true;
 web.userData.fncP9RecessedJoiningPlate=true;
 web.userData.fncP10LongThinConnector=true;

 // Crowned body is intentionally closer to FAL's stylized 3D shoulders.
 // The lower visibly projects OUTSIDE both upper sides.
 crownedUpper();
 // Integrate the magwell lip into the lower instead of stacking two almost
 // coplanar full-width extrusions. Broad steel lower edge remains readable.
 const lower=p('receiver',[
  [-6.30,-.98],[3.28,-.98],[3.18,-2.30],
  [3.00,-3.06],[.18,-3.06],[-.40,-2.70],
  [-1.30,-2.35],[-6.30,-2.35]
 ],3.42,'lower');
 lower.userData.fncAngularLower=true;
 lower.userData.fncMagwellLip=true;
 // A single broad dark step makes upper and lower readable as separate
 // stampings from either side; unlike fine engraved lines it survives zoom.
 const seam=p('receiver',[
  [-6.19,-.97],[2.91,-.97],[2.87,-1.12],[-6.19,-1.12]
 ],3.56,'shadow');
 seam.userData.fncP8UpperLowerSeam=true;
 seam.castShadow=false;seam.receiveShadow=false;
 // Independent shallow magwell housing, proud of the lower shell sides.
 // It is one larger iconic shape, not a stack of detail plates.
 const well=p('receiver',[
  [.01,-2.24],[3.18,-2.24],[3.08,-3.18],[.30,-3.18]
 ],3.65,'lower');
 well.userData.fncP8DistinctMagwell=true;

 // Preserve P8's narrowed raked polymer grip; the separate P8 trigger
 // frame was too literal for this silhouette and is deliberately removed.
 const grip=p('grip',[
  [-5.48,-2.26],[-3.48,-2.26],[-3.72,-2.68],
  [-4.89,-5.62],[-6.42,-5.75],[-6.59,-5.52]
 ],1.99,'grip');
 grip.userData.fncGrip=true;
 grip.userData.fncP8NarrowGrip=true;
 // Shared 30-round STANAG centerline/normal math: not another hand-tuned
 // stepped magazine. Two broad pressed ribs track the same curved face.
 const magazineCurve={
  ...arMagazineCurve('30',1.65,-2.81,2.32,1.40),
  length:4.68,sweep:.72
 };
 const mag=p('magazine',arMagazineOutline(magazineCurve),
  magazineCurve.depth,'magazine');
 mag.userData.fnc556Magazine=true;
 mag.userData.fnc30RoundCurved=true;
 for(const profile of arMagazineRibOutlines(magazineCurve)){
  const rib=p('magazine',profile,1.45,'stamp');
  rib.userData.fncStampedMagazineRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }

 // P12: retain the two distinct mark languages, but move the upper
 // cover down/back into the body and seat; no exploded-looking gap.
 addFNCFacetedForearm(root,mat('handguard'));
 addFNCHandstopLip(root,mat('handguard'));
 addFNCUpperGasBox(root,mat('steel'));
 addFNCForearmMarks(root,mat('shadow'));
 // Retain corrected P1B barrel diameter and overall muzzle/stock datums.
 // P7: barrel begins INSIDE the existing fore-end and continues through
 // the front-sight base, not hovering beyond the handguard termination.
 // Both factory and suppressed paths retain their original MUZZLE endpoint.
 const barrelStartX=8.55;
 const barrelEndX=showFactoryMuzzle?19.005:FNC_P1.muzzleX;
 const barrel=b('barrel',(barrelStartX+barrelEndX)/2,0,0,
  barrelEndX-barrelStartX,1.00,1.00,'barrel');
 barrel.userData.fncServiceBarrel=true;
 barrel.userData.fncP7BarrelStartX=barrelStartX;
 if(showFactoryMuzzle){
  // An elongated but still chunky six-sided factory device. Keep the
  // original 19.50 muzzle-tip art datum and continuous barrel overlap.
  const geometry=new THREE.CylinderGeometry(.83,.83,1.74,6,1);
  // Aim a facet vertex vertically so the six-sided shroud retains its
  // intended full visible width instead of appearing unexpectedly skinny.
  geometry.rotateY(Math.PI/6);
  geometry.rotateZ(Math.PI/2);
  const muzzle=new THREE.Mesh(geometry,mat('muzzle'));
  muzzle.position.x=18.63;
  muzzle.name='family-barrel-fnc-p5-service-muzzle-'+ids.barrel++;
  muzzle.userData.fncMuzzle=true;
  muzzle.userData.fncP4SingleMuzzle=true;
  muzzle.userData.fncP5ChunkyMuzzle=true;
  muzzle.userData.fncP6StubbyMuzzle=true;
  muzzle.userData.fncP7BalancedMuzzle=true;
  muzzle.userData.fncP8TaperedMuzzleMass=true;
  muzzle.castShadow=true;muzzle.receiveShadow=true;
  root.add(muzzle);
 }
 // P12: pull the broad gas/sight seat back 0.50 art units and keep it
 // firmly intersecting the longer vented cover (no isolated sight tower).
 const front=p('barrel',[
  [12.62,-.32],[12.68,.90],[13.25,1.30],
  [15.42,1.30],[15.42,-.32]
 ],2.04,'steel');
 front.userData.fncP7ContinuousGasSightSeat=true;
 front.userData.fncFrontSightBase=true;
 front.userData.fncP4IntegratedGasSeat=true;
 // Share the FAL's actual Fieldwork grammar: TWO chunky cuboid ears,
 // with no central miniature post or sculpted horseshoe. A real open
 // void between ears reads cleanly from the side, front and obliques.
 // Each ear intersects the broad base. Only two simple meshes are needed.
 for(const side of [-1,1] as const){
  const ear=b('barrel',14.66,2.08,side*.72,
   .76,2.02,.80,'steel');
  ear.userData.fncP12FALLikeFrontEar=side<0?'left':'right';
  ear.userData.fncProtectedFrontSight=true;
  if(side===-1){
   // Historical tags keep the shared Arsenal inspections working.
   ear.userData.fncP5OversizedFrontSight=true;
   ear.userData.fncP6BroadProtectedSight=true;
  }
 }
 // Compact rear ear is deliberately smaller than the tall tapered
 // front shroud: both read at miniature scale without matching towers.
 const rear=aperture('receiver','rear-guard',
  [[-5.65,1.42],[-5.60,2.48],[-4.18,2.48],[-4.13,1.42]],
  [[-5.17,1.77],[-4.63,1.77],[-4.72,2.19],[-5.09,2.19]],
  1.28);
 rear.userData.fncP8CompactRearSight=true;
 rear.userData.fncRearAperture=true;
 rear.userData.fncProtectedRearSight=true;
 rear.userData.fncP5OversizedRearSight=true;
 rear.userData.fncP6BroadProtectedSight=true;

 // Correct right-hand relationship: the broad rear ejection opening
 // occupies x -1.22..0.68; a shallow forward track reaches the charging
 // handle around x 2.2. One connected graphic, no tiny floating panels.
 const operatingSlot=p('receiver',[
  [-1.22,.60],[2.55,.60],[2.55,.29],
  [.68,.29],[.68,-.20],[-1.22,-.20]
 ],.10,'shadow');
 operatingSlot.position.z=1.355;
 operatingSlot.userData.fncRightPort=true;
 operatingSlot.userData.fncP7UnifiedEjectionSlot=true;
 operatingSlot.userData.fncP8RearPortForwardHandle=true;
 operatingSlot.castShadow=false;operatingSlot.receiveShadow=false;
 // Charging knob lies FORWARD of the ejection cutout, still attached to
 // and projecting from the upper receiver. Preserve the one-piece stem.
 const handleStem=b('receiver',2.16,.69,1.53,.59,.54,.80,'steel');
 handleStem.userData.fncP6ChargingHandleStem=true;
 handleStem.userData.fncP7SlotAnchoredStem=true;
 const handle=p('receiver',[
  [1.80,.44],[2.50,.44],[2.65,1.08],[1.77,1.08]
 ],1.18,'steel');
 handle.position.z=2.15;
 handle.userData.fncRightChargingHandle=true;
 handle.userData.fncSixFacetedHandle=true;
 handle.userData.fncP5LargeChargingHandle=true;
 handle.userData.fncP6ProtrudingChargingHandle=true;
 handle.userData.fncP7PortAlignedHandle=true;
 handle.userData.fncP8ForwardChargingHandle=true;
 const selectorGeo=new THREE.CylinderGeometry(.37,.37,.22,6,1);
 selectorGeo.rotateX(Math.PI/2);
 const selector=new THREE.Mesh(selectorGeo,mat('steel'));
 selector.name='family-receiver-fnc-p2-selector';
 selector.position.set(-4.63,-1.55,-1.47);
 selector.userData.fncLeftSelector=true;
 selector.castShadow=true;selector.receiveShadow=true;
 root.add(selector);
 return root;
}
