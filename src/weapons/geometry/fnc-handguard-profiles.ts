/** FN FNC P12: tight two-zone front end; static geometry, no fine texture.
 * Compact six-face polymer grip: two long ribs on each side, small front lip.
 * Longer, narrower gas cover: two rows of FIVE broken slots on each side
 * and five slots over the roof, batched into one mesh per visible face.
 * +X muzzle, +Y up, +Z right.
 */
import * as THREE from 'three';
type Station=Readonly<{x:number;scale:number}>;
const STATIONS:readonly Station[]=[
 {x:3.45,scale:.96},{x:4.12,scale:1.065},
 {x:8.98,scale:1.065},{x:9.55,scale:.98}
];
const HEX:readonly (readonly [number,number])[]=[
 [-2.04,-.65],[-2.04,.65],[-1.21,1.10],
 [-.18,.76],[-.18,-.76],[-1.21,-1.10]
];
const vertex=(s:Station,i:number):[number,number,number]=>{
 const [y,z]=HEX[i];
 return [s.x,-1.11+(y+1.11)*s.scale,z*s.scale];
};
export function addFNCFacetedForearm(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const verts:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  verts.push(...a,...b,...c);
 for(let n=0;n<STATIONS.length-1;n++)for(let i=0;i<6;i++){
  const j=(i+1)%6;
  const a=vertex(STATIONS[n],i),b=vertex(STATIONS[n+1],i),
   c=vertex(STATIONS[n+1],j),d=vertex(STATIONS[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 const rear=STATIONS[0],front=STATIONS[STATIONS.length-1];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri([rear.x,-1.11,0],vertex(rear,i),vertex(rear,j));
  tri([front.x,-1.11,0],vertex(front,j),vertex(front,i));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-fnc-p11-short-wide-polymer';
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=6;
 mesh.userData.fncP5LowerHex=true;
 mesh.userData.fncMoldedFlutesPerSide=2;
 mesh.userData.fncP11ShortWidePolymer=true;
 mesh.userData.fncP6OutwardEndcaps=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
export function addFNCHandstopLip(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 // A thicker, visible molded endstop instead of a paper-thin fin.
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.68,2.30,2.66),material);
 mesh.position.set(9.48,-1.18,0);
 mesh.userData.fncP12ChunkyHandstop=true;
 mesh.name='family-handguard-fnc-p11-small-handstop';
 mesh.userData.fncP11HandstopLip=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
export function addFNCUpperGasBox(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 // Move the cover .40 toward the receiver and .24 down into the
 // polymer profile. The near end still connects to the front sight seat.
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(8.90,1.08,1.34),material);
 mesh.position.set(9.50,.04,0); // X 5.05..13.95, Y -.50...58
 mesh.userData.fncP12CompressedGasCover=true;
 mesh.name='family-handguard-fnc-p11-slim-vented-cover';
 mesh.userData.fncP5UpperGasBox=true;
 mesh.userData.fncP6NarrowGasBox=true;
 mesh.userData.fncP7ConnectedGasHousing=true;
 mesh.userData.fncP11LongSlimVentedCover=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
const GAS_SLOTS:readonly (readonly [number,number])[]=[
 [5.56,6.56],[7.02,8.02],[8.48,9.48],
 [9.94,10.94],[11.40,12.40]
];
const quad=(out:number[],a:readonly number[],b:readonly number[],
 c:readonly number[],d:readonly number[],flip=false)=>{
 if(flip)out.push(...a,...c,...b,...a,...d,...c);
 else out.push(...a,...b,...c,...a,...c,...d);
};
export function addFNCForearmMarks(root:THREE.Group,
 dark:THREE.Material):THREE.Mesh[]{
 const marks:THREE.Mesh[]=[];
 const addSide=(side:-1|1,level:'upper'|'lower')=>{
  const pos:number[]=[], upper=level==='upper';
  const ys=upper?[-.20,.22]:[-.81,-1.53];
  const spans=upper?GAS_SLOTS:[[4.49,8.90]] as const;
  const height=upper?.155:.24;
  const depth=(y:number)=>{
   if(upper)return .67+.052;
   // Matches the two faceted side slopes at the wide central stations.
   const mid=-1.2165,top=-.11955,bottom=-2.10045;
   const zm=1.10*1.065,zt=.76*1.065,zb=.65*1.065;
   return (y>=mid
    ?zm+(y-mid)*(zt-zm)/(top-mid)
    :zm+(mid-y)*(zb-zm)/(mid-bottom))+.055;
  };
  for(const y of ys)for(const [x0,x1] of spans){
   const h=height/2;
   const v=(x:number,yy:number):[number,number,number]=>
    [x,yy,side*depth(yy)];
   quad(pos,v(x0,y-h),v(x1,y-h),v(x1,y+h),v(x0,y+h),side<0);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,dark);
  mesh.name='family-handguard-fnc-p11-'+level+'-marks-'+side;
  mesh.userData.fncP5GrooveSide=side;
  mesh.userData.fncP5GrooveLevel=level;
  mesh.userData.fncP5GrooveCount=ys.length;
  mesh.userData.fncP6GrooveSegmentsPerRow=spans.length;
  mesh.userData.fncP7ReducedUpperMarks=upper;
  mesh.userData.fncP6BoldGrooveHeight=height;
  mesh.userData.fncP11BrokenGasSideSlots=upper;
  mesh.userData.fncP11PolymerLongRibs=!upper;
  mesh.castShadow=false;mesh.receiveShadow=false;
  root.add(mesh);marks.push(mesh);
 };
 for(const side of [-1,1] as const){
  addSide(side,'upper');addSide(side,'lower');
 }
 const top:number[]=[];
 for(const [x0,x1] of GAS_SLOTS){
  const y=.635,z=.25;
  const a:[number,number,number]=[x0,y,-z],
   b:[number,number,number]=[x1,y,-z],
   c:[number,number,number]=[x1,y,z],
   d:[number,number,number]=[x0,y,z];
  quad(top,a,b,c,d,true); // +Y-facing roof with real normals
 }
 const roofGeo=new THREE.BufferGeometry();
 roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(top,3));
 roofGeo.computeVertexNormals();
 const roof=new THREE.Mesh(roofGeo,dark);
 roof.name='family-handguard-fnc-p11-roof-vent-row';
 roof.userData.fncP11TopGasVentRow=true;
 roof.userData.fncP11TopGasVentCount=GAS_SLOTS.length;
 roof.castShadow=false;roof.receiveShadow=false;
 root.add(roof);marks.push(roof);
 return marks;
}
