/** Abstract exterior sculpture for the stylized Fieldwork miniature.
 * These are authored game-art planes, not physical dimensions or mechanisms.
 * One opaque shell; no extra parts or runtime behavior.
 */
import * as THREE from 'three';
type ArtStyle='classic'|'classic-polymer'|'polymer'|'clubfoot';
type Section=readonly [x:number,top:number,bottom:number,halfWidth:number,facet:number];
const classic:readonly Section[]=[
 [-15.45,0,-3.24,1.40,.18],
 [-12.75,.05,-3.35,1.49,.34],
 [-9.75,.24,-2.83,1.35,.32],
 [-6.42,.92,-2.04,1.20,.17]
];
const forms:Record<ArtStyle,readonly Section[]>={
 classic,
 'classic-polymer':classic.map(([x,top,bottom,z,c])=>[x,top,bottom,z,c*.65] as const),
 polymer:[
  [-14.40,.15,-2.92,1.40,.12],
  [-12.40,.18,-3.06,1.50,.18],
  [-9.55,.42,-2.60,1.40,.18],
  [-6.20,.72,-1.83,1.20,.12]
 ],
 clubfoot:[
  [-15.85,.69,-3.42,1.43,.18],
  [-13.75,.78,-4.06,1.50,.30],
  [-11.20,.86,-3.20,1.45,.32],
  [-9.96,.91,-1.99,1.28,.24],
  [-6.22,1.01,-1.48,1.18,.18]
 ]
};
export function addAKSolidFurnitureArt(root:THREE.Group,id:string,index:number,
 style:ArtStyle,material:THREE.Material):THREE.Mesh{
 const rings=forms[style].map(([x,top,bottom,z,c])=>[
  [x,top,-z+c],[x,top,z-c],[x,top-c,z],[x,bottom+c,z],
  [x,bottom,z-c],[x,bottom,-z+c],[x,bottom+c,-z],[x,top-c,-z]
 ]);
 const points:number[]=[];
 const tri=(a:number[],b:number[],c:number[])=>points.push(...a,...b,...c);
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<8;j++){
  const a=rings[k],b=rings[k+1],n=(j+1)%8;
  tri(a[j],a[n],b[n]);tri(a[j],b[n],b[j]);
 }
 const first=rings[0],last=rings[rings.length-1];
 for(let j=1;j<7;j++){tri(first[0],first[j+1],first[j]);tri(last[0],last[j],last[j+1]);}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-stock-'+id+'-'+index;
 mesh.userData.akSolidFurnitureArt=style;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
