/** Low-poly exterior sculpture for fictional game miniatures.
 * Broad planar cross-sections, not engineering or physical stock geometry.
 * Authored once per appearance change; all gameplay landmarks are external.
 */
import * as THREE from 'three';
type Style='wood'|'polymer'|'lean'|'compact';
type Section=readonly [x:number,top:number,bottom:number,halfWidth:number,corner:number];
// The four art treatments share a continuous taper rather than an inflated
// belly. No dimensions are derived from physical objects.
const studies:Record<Style,readonly Section[]>={
 wood:[
  [-14.69,1.22,-2.87,1.48,.25],
  [-12.75,1.20,-3.02,1.52,.40],
  [-9.55,.98,-2.32,1.40,.38],
  [-6.18,.67,-1.46,1.24,.22]
 ],
 polymer:[
  [-14.84,1.12,-2.85,1.49,.13],
  [-11.15,1.12,-2.87,1.52,.22],
  [-8.10,.73,-1.87,1.33,.20],
  [-6.15,.69,-1.44,1.22,.13]
 ],
 lean:[
  [-13.44,1.16,-2.75,1.39,.16],
  [-10.95,1.05,-2.49,1.38,.20],
  [-8.30,.78,-1.78,1.25,.18],
  [-6.12,.75,-1.42,1.19,.13]
 ],
 compact:[
  [-12.62,1.07,-2.68,1.51,.18],
  [-10.60,1.05,-2.39,1.49,.25],
  [-8.30,.91,-1.85,1.36,.25],
  [-6.01,.80,-1.35,1.23,.14]
 ]
};
export function addHKFixedFurnitureArt(root:THREE.Group,id:string,index:number,
 style:Style,material:THREE.Material):THREE.Mesh{
 const rings=studies[style].map(([x,top,bottom,z,c])=>[
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
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-stock-'+id+'-'+index;
 mesh.userData.hkFixedFurnitureArt=style;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
