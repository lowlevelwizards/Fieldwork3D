/** FN FNC P18 silhouette-first Fieldwork art. Gameplay anchors untouched.
 * The stock uses one continuous bare upper beam, a kinked lower bar,
 * a thin extended inset plate, compact rectangular hinge and dark butt pad.
 * No cheek sleeve or trigger guard. Visual geometry builds on demand only.
 * +X muzzle, +Y up, +Z right.
 */
import * as THREE from 'three';
import {buildFNCrownMesh} from './fn-crowned-shell.ts';
import {addOutline,addCuboid,addBar} from './profile-primitives.ts';
import type {SlotName,Outline} from './profile-primitives.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines,
 arMagazinePolyBaseplate,addARPolymerMagazineBody}
 from './ar-magazine-profiles.ts';
import {addFNCFacetedForearm,addFNCHandstopLip,addFNCForearmMarks,addFNCUpperGasBox}
 from './fnc-handguard-profiles.ts';
import {FNC_FRONT_P13} from './fnc-front-layout.ts';

export const FNC_P1=Object.freeze({
 stockRearX:-14.85,receiverRearX:-6.38,receiverFrontX:4.12,
 handguardStartX:3.45,handguardEndX:13.55,
 frontSightX:15.20,muzzleX:19.50,magazineBottomY:-8.11,
 nominalBarrelInches:17.7
});
type Finish='steel'|'lower'|'stock'|'buttpad'|'grip'|'handguard'|
 'magazine'|'stamp'|'barrel'|'muzzle'|'shadow';
export type FNCArtFinishes=Readonly<Partial<Record<Finish,THREE.Material>>>;

export function buildFNCStage1Silhouette(
 material:THREE.Material,finishes:FNCArtFinishes={},showFactoryMuzzle=true,
 magazinePart='ar-mag30'
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p18-fieldwork-bold-silhouette';
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
   {x:-6.38,top:1.77,bottom:-1.10,side:1.39,roof:.88},
   {x:-5.59,top:FNC_FRONT_P13.receiver.roofY,bottom:-1.10,side:1.39,roof:.88},
   {x:2.17,top:FNC_FRONT_P13.receiver.roofY,bottom:-1.10,side:1.39,roof:.88},
   {x:FNC_FRONT_P13.receiver.frontX,top:FNC_FRONT_P13.receiver.roofY,
    bottom:-1.10,side:1.39,roof:.88}
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
  mesh.userData.fncP5RoofHalfWidth=.88;
  mesh.userData.fncP5UpperSideHalfWidth=1.39;
  mesh.userData.fncP18BroadStampedUpper=true;
  mesh.userData.fncP6OutwardReceiverEndcaps=true;
  mesh.userData.fncP6ShortenedReceiverFrontX=FNC_FRONT_P13.receiver.frontX;
  mesh.userData.fncP7ReceiverLength=FNC_FRONT_P13.receiver.frontX+6.38;
  mesh.userData.fncP15FlatReceiverNose=true;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  return mesh;
 };
 // Remove the oversized rear cheek sleeve entirely. A continuous
 // metal-colored top rail replaces BOTH old segments, avoiding a gap,
 // doubled faces or additional draw calls.
 const top=rail([-6.45,.03],[-14.26,-.04],1.12);
 top.userData.fncP9UpperMetalRail=true;
 top.userData.fncP10ContinuousBareUpperRail=true;
 // Lower rail stays parallel for over three art units; at x=-10.18 its
 // single angular knee descends toward the lower butt connection.
 // A single six-vertex extrusion avoids separate, z-fighting bar joins.
 const lowerRail=p('stock',[
  [-6.52,-1.23],[-10.18,-1.23],[-14.38,-3.01],
  [-14.38,-3.63],[-10.05,-2.06],[-6.52,-2.06]
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
  [-14.85,.92],[-14.12,.92],[-14.02,.58],
  [-14.02,-3.92],[-14.35,-4.27],[-14.85,-4.27]
 ],2.18,'buttpad');
 pad.userData.fncP8NarrowButtplate=true;
 pad.userData.fncButtPlate=true;
 pad.userData.fncP9ConnectedButtplate=true;
 pad.userData.fncP10DarkThickButtpad=true;
 pad.userData.fncP17BoldButtpad=true;
 pad.userData.fncP18OversizedButtpad=true;
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
 // P17: integrate the magazine socket INTO the lower outline, just as
 // the successful FAL draws its lower as one deliberately sculpted body.
 // The front face drops nearly perpendicular to the mag seat. NO extra
 // over-depth well extrusion; this is a single volume with true overlap
 // with the 30-round STANAG neck.
 const receiverNoseX=FNC_FRONT_P13.receiver.frontX;
 const lower=p('receiver',[
  [-6.30,-1.09],[receiverNoseX,-1.09],
  [receiverNoseX,-3.30],[2.56,-3.46],
  [-.67,-3.46],[-.67,-2.78],[-.90,-2.78],
  [-1.30,-2.58],[-6.30,-2.58]
 ],3.42,'lower');
 lower.userData.fncP15FlatLowerNose=true;
 lower.userData.fncAngularLower=true;
 lower.userData.fncMagwellLip=true;
 lower.userData.fncP8DistinctMagwell=true; // legacy integrated-lip marker
 lower.userData.fncP16IntegratedMagazineSocket=true;
 lower.userData.fncP17SinglePieceMagwell=true;
 lower.userData.fncP18SquaredMagazineHousing=true;
 // A single broad dark step makes upper and lower readable as separate
 // stampings from either side; unlike fine engraved lines it survives zoom.
 const seam=p('receiver',[
  [-6.19,-1.05],[FNC_FRONT_P13.receiver.seamFrontX,-1.05],
  [FNC_FRONT_P13.receiver.seamFrontX,-1.38],[-6.19,-1.38]
 ],3.56,'shadow');
 seam.userData.fncP8UpperLowerSeam=true;
 seam.castShadow=false;seam.receiveShadow=false;
 // The lower now owns the magwell silhouette; no second Z-heavy slab.
 // One deliberate stamping on the lower's flank, not decorative rivets.
 const stamp=p('receiver',[
  [-5.83,-2.02],[-1.02,-2.02],[-.85,-2.25],[-5.83,-2.25]
 ],.075,'shadow');
 stamp.position.z=1.725;
 stamp.userData.fncP16LowerStampRelief=true;
 stamp.castShadow=false;stamp.receiveShadow=false;

 // Preserve P8's narrowed raked polymer grip; the separate P8 trigger
 // frame was too literal for this silhouette and is deliberately removed.
 const gripBase:Outline=[
  [-5.48,-2.26],[-3.48,-2.26],[-3.72,-2.68],
  [-4.89,-5.62],[-6.42,-5.75],[-6.59,-5.52]
 ];
 const grip=p('grip',gripBase.map(([x,y])=>
  [x+FNC_FRONT_P13.receiver.gripForwardX,y] as const),1.99,'grip');
 grip.userData.fncGrip=true;
 grip.userData.fncP15GripForwardX=FNC_FRONT_P13.receiver.gripForwardX;
 grip.userData.fncP8NarrowGrip=true;
 // Same AR STANAG 20/30/poly silhouettes, dimensions and ribs, moved
 // only to the FNC receiver's local insertion datum. Legacy fnc-mag30
 // uses the AR 30 steel art rather than another profile.
 const magStyle=magazinePart==='ar-mag20'?'20':
  magazinePart==='ar-magpoly'?'poly':'30';
 const magazineCurve=arMagazineCurve(magStyle,
  FNC_FRONT_P13.receiver.magazineCenterX,
  FNC_FRONT_P13.receiver.magazineTopY);
 const mag=magStyle==='poly'?
  addARPolymerMagazineBody(root,'magazine','fnc-p5-magazine',
   ids.magazine++,magazineCurve,mat('grip')):
  p('magazine',arMagazineOutline(magazineCurve),
   magazineCurve.depth,'magazine');
 mag.userData.fnc556Magazine=true;
 mag.userData.fnc30RoundCurved=magStyle==='30';
 mag.userData.fncP16CenteredMagazineSeat=true;
 mag.userData.fncSharedARStanag=true;
 mag.userData.fncMagazinePart=magazinePart;
 for(const profile of arMagazineRibOutlines(magazineCurve)){
  const rib=p('magazine',profile,magazineCurve.depth+.075,'stamp');
  rib.userData.fncStampedMagazineRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }
 if(magStyle==='poly'){
  const toe=p('magazine',arMagazinePolyBaseplate(magazineCurve),
   magazineCurve.depth+.12,'grip');
  toe.userData.fncARPolyToe=true;
 }

 // P13: derive every visual component from one front-layout contract.
 // The polymer extends under the gas cover; the six-sided collar wraps
 // the polymer rather than looking like a full-height blade.
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
 const barrel=b('barrel',(barrelStartX+barrelEndX)/2,FNC_FRONT_P13.barrel.axisY,0,
  barrelEndX-barrelStartX,1.34,1.34,'barrel');
 barrel.userData.fncServiceBarrel=true;
 barrel.userData.fncP17ChunkyBarrel=true;
 barrel.userData.fncP18HeavyBarrel=true;
 barrel.userData.fncP7BarrelStartX=barrelStartX;
 if(showFactoryMuzzle){
  // An elongated but still chunky six-sided factory device. Keep the
  // original 19.50 muzzle-tip art datum and continuous barrel overlap.
  const M=FNC_FRONT_P13.muzzle;
  const geometry=new THREE.CylinderGeometry(M.radius,M.radius,M.length,6,1);
  // Aim a facet vertex vertically so the six-sided shroud retains its
  // intended full visible width instead of appearing unexpectedly skinny.
  geometry.rotateY(Math.PI/6);
  geometry.rotateZ(Math.PI/2);
  const muzzle=new THREE.Mesh(geometry,mat('muzzle'));
  muzzle.position.x=M.centerX;
  muzzle.name='family-barrel-fnc-p5-service-muzzle-'+ids.barrel++;
  muzzle.userData.fncMuzzle=true;
  muzzle.userData.fncP4SingleMuzzle=true;
  muzzle.userData.fncP5ChunkyMuzzle=true;
  muzzle.userData.fncP6StubbyMuzzle=true;
  muzzle.userData.fncP7BalancedMuzzle=true;
  muzzle.userData.fncP8TaperedMuzzleMass=true;
  muzzle.userData.fncP16SlenderFNCFlashHider=true;
  muzzle.userData.fncP17BoldShortFlashHider=true;
 muzzle.userData.fncP18StubbyMuzzle=true;
  muzzle.castShadow=true;muzzle.receiveShadow=true;
  root.add(muzzle);
  // Single low-poly batched dark port strip, analogous to the FAL's
  // signature muzzle slots. Draw only in factory configuration.
  const positions:number[]=[];
  const quad=(a:readonly number[],b:readonly number[],
   c:readonly number[],d:readonly number[],reverse:boolean)=>{
   if(reverse)positions.push(...a,...c,...b,...a,...d,...c);
   else positions.push(...a,...b,...c,...a,...c,...d);
  };
  // The surface positions derive from the *new* faceted cylinder radius.
  // An old hard-coded .67 would bury/floats the vent graphics after scaling.
  const facetZ=M.radius*Math.cos(Math.PI/6)+.025;
  for(const side of [-1,1] as const)for(let i=0;i<2;i++){
   const x0=M.slotFirstX+i*M.slotPitch,x1=x0+M.slotLength,
    y0=-M.slotHalfHeight,y1=M.slotHalfHeight,z=side*facetZ;
   quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],side<0);
  }
  const portsGeometry=new THREE.BufferGeometry();
  portsGeometry.setAttribute('position',
   new THREE.Float32BufferAttribute(positions,3));
  portsGeometry.computeVertexNormals();
  const ports=new THREE.Mesh(portsGeometry,mat('shadow'));
  ports.name='family-barrel-fnc-p16-factory-flash-hider-slots-'+ids.barrel++;
  ports.userData.fncP16MuzzleSlotStrip=true;
  ports.userData.fncP17ProjectedMuzzleSlots=true;
  ports.castShadow=false;ports.receiveShadow=false;
  root.add(ports);
 }
 // One minimal contoured gas/sight base. Its rear roof begins at the
 // gas-cover roof height, and only climbs gently under the sight ears.
 // It shares the front-layout stations instead of separately tuning them.
 const s=FNC_FRONT_P13.sight;
 const front=p('barrel',[
  [s.baseStartX,s.baseBottomY],[s.baseStartX,s.baseRearTopY],
  [s.baseFlatStartX,s.baseTopY],
  [s.baseEndX,s.baseTopY],[s.baseEndX,s.baseBottomY]
 ],s.baseDepth,'steel');
 front.userData.fncP13CompactIntegratedSightBase=true;
 front.userData.fncP14LowSightBase=true;
 front.userData.fncP15AlignedGasSightBase=true;
 front.userData.fncP16CompactGasSightBase=true;
 front.userData.fncP17SimplifiedSightSeat=true;
 front.userData.fncP7ContinuousGasSightSeat=true;
 front.userData.fncFrontSightBase=true;
 front.userData.fncP4IntegratedGasSeat=true;
 // Exactly two chamfered six-point FAL-family ears. Real center void;
 // no extra post, no modeled pin, no tall parallel rectangular towers.
 for(const side of [-1,1] as const){
  const rearX=s.earX-s.earLength/2,frontX=s.earX+s.earLength/2;
  const ear=p('barrel',[
   [rearX,s.earBottomY],[rearX,s.earShoulderY],
   [rearX+.16,s.earTopY],[frontX-.12,s.earTopY],
   [frontX,s.earShoulderY],[frontX,s.earBottomY]
  ],s.earDepth,'steel');
  ear.position.z=side*s.earHalfSpacing;
  ear.userData.fncP12FALLikeFrontEar=side<0?'left':'right';
  ear.userData.fncP13CompactFrontEar=true;
  ear.userData.fncP14ReducedFrontEar=true;
  ear.userData.fncP15IntegratedFrontEar=true;
  ear.userData.fncP16ChamferedSightGuard=true;
  ear.userData.fncProtectedFrontSight=true;
  if(side===-1){
   ear.userData.fncP5OversizedFrontSight=true;
   ear.userData.fncP6BroadProtectedSight=true;
  }
 }
 // Compact rear ear is deliberately smaller than the tall tapered
 // front shroud: both read at miniature scale without matching towers.
 const rear=aperture('receiver','rear-guard',
  [[-5.78,1.73],[-5.72,3.06],[-4.02,3.06],[-3.98,1.73]],
  [[-5.31,2.00],[-4.41,2.00],[-4.54,2.78],[-5.16,2.78]],
  1.44);
 rear.userData.fncP8CompactRearSight=true;
 rear.userData.fncP17GraphicRearAperture=true;
 rear.userData.fncP18BoldRearSight=true;
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
 const selectorBar=p('receiver',[
  [-4.65,-1.66],[-3.87,-1.41],[-3.78,-1.61],[-4.56,-1.85]
 ],.16,'steel');
 selectorBar.position.z=-1.76;
 selectorBar.userData.fncP16BroadSelectorLever=true;
 return root;
}
