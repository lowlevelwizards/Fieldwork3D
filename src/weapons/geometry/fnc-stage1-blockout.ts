/** FN FNC P7 shared Arsenal/Workbench/operator silhouette.
 * Deliberate five-mass Fieldwork grammar: crowned FAL-like upper narrower
 * than the lower, actual triangular FNC stock brace, hexagonal polymer
 * handguard UNDER a separate upper gas-box, and bold simple rifle hardware.
 * No trigger guard. +X muzzle, +Y up, +Z right; static geometry on demand.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addBar} from './profile-primitives.ts';
import type {SlotName,Outline} from './profile-primitives.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines}
 from './ar-magazine-profiles.ts';
import {addFNCFacetedForearm,addFNCForearmMarks,addFNCUpperGasBox}
 from './fnc-handguard-profiles.ts';

export const FNC_P1=Object.freeze({
 stockRearX:-14.85,receiverRearX:-6.38,receiverFrontX:4.12,
 handguardStartX:3.45,handguardEndX:13.55,
 frontSightX:15.20,muzzleX:19.50,magazineBottomY:-7.80,
 nominalBarrelInches:17.7
});
type Finish='steel'|'lower'|'stock'|'cheek'|'grip'|'handguard'|
 'magazine'|'stamp'|'barrel'|'muzzle'|'shadow';
export type FNCArtFinishes=Readonly<Partial<Record<Finish,THREE.Material>>>;

export function buildFNCStage1Silhouette(
 material:THREE.Material,finishes:FNCArtFinishes={},showFactoryMuzzle=true
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p7-fieldwork-exterior';
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
  const ring=(s:typeof stations[number],i:number):[number,number,number]=>{
   const shoulder=Math.max(s.bottom+.48,s.top-1.20);
   const yz:readonly (readonly [number,number])[]=[
    [s.bottom,-s.side],[s.bottom,s.side],[shoulder,s.side],
    [s.top,s.roof],[s.top,-s.roof],[shoulder,-s.side]
   ];
   return [s.x,yz[i][0],yz[i][1]];
  };
  const positions:number[]=[];
  const tri=(a:readonly number[],b:readonly number[],d:readonly number[])=>
   positions.push(...a,...b,...d);
  for(let n=0;n<stations.length-1;n++)for(let i=0;i<6;i++){
   const j=(i+1)%6;
   const a=ring(stations[n],i),b=ring(stations[n+1],i),
    d=ring(stations[n+1],j),e=ring(stations[n],j);
   tri(a,b,d);tri(a,d,e);
  }
  const a=stations[0],z=stations[stations.length-1];
  for(let i=0;i<6;i++){
   const j=(i+1)%6;
   // P5 caps were inward-facing; side strip already faces outward.
   // The rear face is -X and the front face is +X.
   tri([a.x,0,0],ring(a,i),ring(a,j));
   tri([z.x,-.30,0],ring(z,j),ring(z,i));
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat('steel'));
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
 // The insulated top tube and its metal portion now own DISJOINT lengths.
 // P2 drew the entire metal rail under a larger sleeve: equal-depth faces
 // shimmered in side views. Both terminate at x=-9.46 without overlap.
 rail([-6.45,.03],[-9.46,.01],.69);
 // One stout, gently kinked lower member; NO flat triangular panel.
 const lowerRail=p('stock',[
  [-6.48,-1.34],[-8.88,-1.61],[-14.12,-2.75],
  [-14.12,-3.45],[-8.90,-2.33],[-6.48,-2.02]
 ],1.12,'stock');
 lowerRail.userData.fncStockRail=true;
 lowerRail.userData.fncKinkedLowerRail=true;
 const hinge=p('stock',[
  [-6.94,.29],[-6.05,.29],[-6.02,-1.83],[-6.94,-1.83]
 ],1.66,'stock');
 hinge.userData.fncStockHinge=true;
 const pad=p('stock',[
  [-14.85,.36],[-14.03,.36],[-13.99,-3.36],
  [-14.32,-3.56],[-14.85,-3.56]
 ],1.96,'stock');
 pad.userData.fncButtPlate=true;
 const cheek=rail([-9.46,.01],[-14.03,-.04],1.04,'cheek');
 cheek.userData.fncStockRail=false;
 cheek.userData.fncCheekSleeve=true;
 cheek.userData.fncNoCoplanarRail=true;
 // FNC-specific triangular middle web: rests BETWEEN top and lower tube
 // in the rear/middle portion, rather than filling the stock's large void.
 // It is a chunky single gusset, not a false third full-length rail.
 const web=p('stock',[
  [-12.20,-.47],[-10.38,-.47],[-11.43,-2.35]
 ],.98,'stock');
 web.userData.fncP5StockMiddleBrace=true;
 web.userData.fncP6BoldStockWeb=true;
 web.userData.fncP7StockWeb=true;

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

 // A substantial lower heel and one bold rearward rake, not a wafer wedge.
 const grip=p('grip',[
  [-5.56,-2.26],[-3.35,-2.26],[-3.61,-2.68],
  [-4.79,-5.62],[-6.60,-5.75],[-6.79,-5.52]
 ],2.18,'grip');
 grip.userData.fncGrip=true;
 // Shared 30-round STANAG centerline/normal math: not another hand-tuned
 // stepped magazine. Two broad pressed ribs track the same curved face.
 const magazineCurve={
  ...arMagazineCurve('30',1.65,-2.81,2.55,1.49),
  length:4.65,sweep:.72
 };
 const mag=p('magazine',arMagazineOutline(magazineCurve),
  magazineCurve.depth,'magazine');
 mag.userData.fnc556Magazine=true;
 mag.userData.fnc30RoundCurved=true;
 for(const profile of arMagazineRibOutlines(magazineCurve)){
  const rib=p('magazine',profile,1.54,'stamp');
  rib.userData.fncStampedMagazineRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }

 // Two distinctive primary masses: narrow hexagonal polymer cylinder
 // beneath one upper gas-block box. TWO long lower side lines, THREE on
 // the upper box. No tiny vent holes and no extra collar stack.
 addFNCFacetedForearm(root,mat('handguard'));
 addFNCUpperGasBox(root,mat('steel'));
 addFNCForearmMarks(root,mat('shadow'));
 // Retain corrected P1B barrel diameter and overall muzzle/stock datums.
 // P7: barrel begins INSIDE the existing fore-end and continues through
 // the front-sight base, not hovering beyond the handguard termination.
 // Both factory and suppressed paths retain their original MUZZLE endpoint.
 const barrelStartX=12.20;
 const barrelEndX=showFactoryMuzzle?19.005:FNC_P1.muzzleX;
 const barrel=b('barrel',(barrelStartX+barrelEndX)/2,0,0,
  barrelEndX-barrelStartX,1.04,1.04,'barrel');
 barrel.userData.fncServiceBarrel=true;
 barrel.userData.fncP7BarrelStartX=barrelStartX;
 if(showFactoryMuzzle){
  // One still oversized, but STUBBIER six-sided muzzle.
  // Its forward endpoint remains the original factory muzzle datum 19.50.
  const geometry=new THREE.CylinderGeometry(.94,.94,1.48,6,1);
  geometry.rotateZ(Math.PI/2);
  const muzzle=new THREE.Mesh(geometry,mat('muzzle'));
  muzzle.position.x=18.76;
  muzzle.name='family-barrel-fnc-p5-service-muzzle-'+ids.barrel++;
  muzzle.userData.fncMuzzle=true;
  muzzle.userData.fncP4SingleMuzzle=true;
  muzzle.userData.fncP5ChunkyMuzzle=true;
  muzzle.userData.fncP6StubbyMuzzle=true;
  muzzle.userData.fncP7BalancedMuzzle=true;
  muzzle.castShadow=true;muzzle.receiveShadow=true;
  root.add(muzzle);
 }
 // Large and un-fiddly. Front guard is deliberately the dominant icon;
 // its inner hole remains one broad cutout, not a fine modeled post.
 // This one broad sight/gas seat reaches REARWARD into the lower
 // handguard and gas-box terminus; no extra connector cuboid.
 const front=p('barrel',[
  [13.12,-.32],[13.18,.90],[13.75,1.30],
  [15.92,1.30],[15.92,-.32]
 ],2.04,'steel');
 front.userData.fncP7ContinuousGasSightSeat=true;
 front.userData.fncFrontSightBase=true;
 front.userData.fncP4IntegratedGasSeat=true;
 const sight=aperture('barrel','front-guard',
  [[14.35,1.24],[14.39,2.61],[14.80,3.23],
   [15.55,3.23],[15.98,2.61],[16.00,1.24]],
  [[14.89,1.80],[15.00,2.67],[15.37,2.67],[15.48,1.80]],
  1.22);
 sight.userData.fncProtectedFrontSight=true;
 sight.userData.fncP5OversizedFrontSight=true;
 sight.userData.fncP6BroadProtectedSight=true;
 // Smaller, wider protective ear, avoiding the freestanding LEGO turret.
 const rear=aperture('receiver','rear-guard',
  [[-5.87,1.40],[-5.79,2.62],[-4.01,2.62],[-3.93,1.40]],
  [[-5.30,1.78],[-5.21,2.20],[-4.65,2.20],[-4.55,1.78]],
  1.32);
 rear.userData.fncRearAperture=true;
 rear.userData.fncProtectedRearSight=true;
 rear.userData.fncP5OversizedRearSight=true;
 rear.userData.fncP6BroadProtectedSight=true;

 // A single ejection/charging opening, not isolated black port and side
 // handle. One low-vertex L silhouette runs from the shallow retracting
 // handle slot into the forward ejection opening, like the real FNC.
 // Position is mapped to the actual outside of the crowned receiver side.
 const operatingSlot=p('receiver',[
  [-.28,.67],[3.07,.67],[3.07,-.28],
  [1.39,-.28],[1.39,.25],[-.28,.25]
 ],.10,'shadow');
 operatingSlot.position.z=1.355;
 operatingSlot.userData.fncRightPort=true;
 operatingSlot.userData.fncP7UnifiedEjectionSlot=true;
 operatingSlot.castShadow=false;operatingSlot.receiveShadow=false;
 // The handle sits WITHIN the receiver-side charging-slot outline,
 // just behind the ejection window and markedly proud of the receiver.
 // One stubby steel stem and one large, short lateral grip.
 const handleStem=b('receiver',1.18,.68,1.53,.59,.54,.80,'steel');
 handleStem.userData.fncP6ChargingHandleStem=true;
 handleStem.userData.fncP7SlotAnchoredStem=true;
 const handle=p('receiver',[
  [.78,.42],[1.51,.42],[1.66,1.07],[.76,1.07]
 ],1.18,'steel');
 handle.position.z=2.15;
 handle.userData.fncRightChargingHandle=true;
 handle.userData.fncSixFacetedHandle=true;
 handle.userData.fncP5LargeChargingHandle=true;
 handle.userData.fncP6ProtrudingChargingHandle=true;
 handle.userData.fncP7PortAlignedHandle=true;
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
