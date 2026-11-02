/** Exterior-only greedy cuboid union; a single solid mesh with no coplanar
 * doubles. Optional face tones are baked into vertex colors, never separate
 * overlay geometry. Every surface receives world-scale pixel UV coordinates.
 */
import * as THREE from 'three';
import {TILE_WORLD_SIZE} from './rendering/pixel-recipes.ts';
export type HeadwearCuboid={name:string;x:number;y:number;z:number;
 width:number;height:number;depth:number};
export type CuboidUnionOptions={
 faceTone?:(part:HeadwearCuboid,axis:number,sign:number)=>number;
};
export function unionCuboids(parts:readonly HeadwearCuboid[],
 options:CuboidUnionOptions={}):THREE.BufferGeometry{
 if(!parts.length)throw Error('empty cuboid shell');
 const boundaries=[0,1,2].map(axis=>[...new Set(parts.flatMap(p=>{
  const center=[p.x,p.y,p.z][axis],size=[p.width,p.height,p.depth][axis];
  if(!Number.isFinite(center)||!Number.isFinite(size)||size<=0)
   throw Error('invalid cuboid '+p.name);
  return [center-size/2,center+size/2];
 }))].sort((a,b)=>a-b));
 const shape=boundaries.map(a=>a.length-1),[nx,ny,nz]=shape;
 const idx=(x:number,y:number,z:number)=>(x*ny+y)*nz+z;
 const occupancy=new Uint8Array(nx*ny*nz);
 const within=(p:HeadwearCuboid,q:readonly number[])=>[0,1,2].every(a=>
  Math.abs(q[a]-[p.x,p.y,p.z][a])<[p.width,p.height,p.depth][a]/2-1e-6);
 const center=(q:readonly number[])=>q.map((n,a)=>
  (boundaries[a][n]+boundaries[a][n+1])/2);
 for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++){
  const q=center([x,y,z]);
  occupancy[idx(x,y,z)]=parts.some(p=>within(p,q))?1:0;
 }
 const solid=(q:number[])=>q.every((v,a)=>v>=0&&v<shape[a])?
  !!occupancy[idx(q[0],q[1],q[2])]:false;
 const vertices:number[]=[],indices:number[]=[],uvs:number[]=[],colors:number[]=[];
 const planeAxes:[[number,number],[number,number],[number,number]]=[
  [1,2],[2,0],[0,1]
 ];
 let quads=0;
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const [u,v]=planeAxes[axis],w=shape[u],h=shape[v];
  for(let slice=0;slice<shape[axis];slice++){
   // The material-aware mask preserves real crown/band/rim transitions on
   // otherwise coplanar faces. It does not generate extra surfaces.
   const mask=new Uint16Array(w*h);
   const at=(i:number,j:number)=>{
    const q=[0,0,0];q[axis]=slice;q[u]=i;q[v]=j;return q;
   };
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const q=at(i,j),neighbor=q.slice();neighbor[axis]+=sign;
    if(!solid(q)||solid(neighbor))continue;
    if(!options.faceTone){mask[j*w+i]=1;continue;}
    const p=center(q);
    const edge=boundaries[axis][slice+(sign===1?1:0)];
    // Choose a source cuboid with its actual outward face at this
    // exterior plane. Internal source boundaries never become visible.
    let chosen=-1;
    for(let k=parts.length-1;k>=0;k--){
     const part=parts[k],bound=[part.x,part.y,part.z][axis]+
      sign*[part.width,part.height,part.depth][axis]/2;
     if(within(part,p)&&Math.abs(bound-edge)<1e-5){chosen=k;break;}
    }
    if(chosen<0)throw Error('headwear union face without source');
    mask[j*w+i]=chosen+1;
   }
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const owner=mask[j*w+i];if(!owner)continue;
    let width=1,height=1;
    while(i+width<w&&mask[j*w+i+width]===owner)width++;
    heightScan:while(j+height<h){
     for(let k=0;k<width;k++)
      if(mask[(j+height)*w+i+k]!==owner)break heightScan;
     height++;
    }
    for(let r=0;r<height;r++)for(let c=0;c<width;c++)
     mask[(j+r)*w+i+c]=0;
    const start=vertices.length/3;
    const p=(a:number,b:number)=>{
     const q=[0,0,0];
     q[axis]=boundaries[axis][slice+(sign===1?1:0)];
     q[u]=boundaries[u][i+(a?width:0)];
     q[v]=boundaries[v][j+(b?height:0)];
     return q;
    };
    let tone=1;
    if(options.faceTone){
     tone=options.faceTone(parts[owner-1],axis,sign);
     if(!Number.isFinite(tone)||tone<=0||tone>1)
      throw Error('invalid headwear face tone');
    }
    for(const q of [p(0,0),p(1,0),p(1,1),p(0,1)]){
     vertices.push(...q);
     // Oriented on the actual model axes; exactly 32 authored pixels
     // cover TILE_WORLD_SIZE (40 operator-local units), no UV stretching.
     const texU=axis===0?q[2]:q[0],texV=axis===1?q[2]:q[1];
     uvs.push(texU/TILE_WORLD_SIZE,texV/TILE_WORLD_SIZE);
     if(options.faceTone)colors.push(tone,tone,tone);
    }
    if(sign===1)indices.push(start,start+1,start+2,start,start+2,start+3);
    else indices.push(start,start+2,start+1,start,start+3,start+2);
    quads++;
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 if(options.faceTone)
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();
 geometry.userData.greedyCuboidUnion=true;
 geometry.userData.cuboids=parts.map(p=>({...p}));
 geometry.userData.exteriorQuads=quads;
 geometry.userData.pixelWorldSize=TILE_WORLD_SIZE/32;
 geometry.userData.materialRegions=!!options.faceTone;
 return geometry;
}
