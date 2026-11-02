/** Orthogonal exterior mesher: unions a handful of Blockbench-style boxes
 * into one shell without overlapping visible faces or internal geometry.
 * Every face is a rectangle; coplanar cells are greedily merged.
 * Generated once at model creation, never in the animation loop.
 */
import * as THREE from 'three';
export type HeadwearCuboid={name:string;x:number;y:number;z:number;
 width:number;height:number;depth:number};
export function unionCuboids(parts:readonly HeadwearCuboid[]):THREE.BufferGeometry{
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
 for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++){
  const q=[(boundaries[0][x]+boundaries[0][x+1])/2,
   (boundaries[1][y]+boundaries[1][y+1])/2,
   (boundaries[2][z]+boundaries[2][z+1])/2];
  occupancy[idx(x,y,z)]=parts.some(p=>
   Math.abs(q[0]-p.x)<p.width/2-1e-6&&
   Math.abs(q[1]-p.y)<p.height/2-1e-6&&
   Math.abs(q[2]-p.z)<p.depth/2-1e-6)?1:0;
 }
 const solid=(q:number[])=>q.every((v,a)=>v>=0&&v<shape[a])?
  !!occupancy[idx(q[0],q[1],q[2])]:false;
 const vertices:number[]=[],indices:number[]=[];
 const planeAxes:[[number,number],[number,number],[number,number]]=[
  [1,2],[2,0],[0,1]
 ];
 let quads=0;
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const [u,v]=planeAxes[axis],w=shape[u],h=shape[v];
  for(let slice=0;slice<shape[axis];slice++){
   const mask=new Uint8Array(w*h);
   const at=(i:number,j:number)=>{
    const q=[0,0,0];q[axis]=slice;q[u]=i;q[v]=j;return q;
   };
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const q=at(i,j),neighbor=q.slice();neighbor[axis]+=sign;
    if(solid(q)&&!solid(neighbor))mask[j*w+i]=1;
   }
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    if(!mask[j*w+i])continue;
    let width=1,height=1;
    while(i+width<w&&mask[j*w+i+width])width++;
    heightScan:while(j+height<h){
     for(let k=0;k<width;k++)if(!mask[(j+height)*w+i+k])break heightScan;
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
    for(const q of [p(0,0),p(1,0),p(1,1),p(0,1)])
     vertices.push(...q);
    if(sign===1)indices.push(start,start+1,start+2,start,start+2,start+3);
    else indices.push(start,start+2,start+1,start,start+3,start+2);
    quads++;
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();
 geometry.userData.greedyCuboidUnion=true;
 geometry.userData.cuboids=parts.map(p=>({...p}));
 geometry.userData.exteriorQuads=quads;
 return geometry;
}
