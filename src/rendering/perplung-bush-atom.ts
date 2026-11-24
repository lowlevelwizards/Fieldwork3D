/** V3: Perplung Bush Study 04, source 8ffb7a0b870cf7158b63a6796a916bac3c8f89b4.
 * Normalized, owner-local visual atom. No simulation or fixture changes.
 */
import * as THREE from 'three';
const TAU=Math.PI*2;
export function makeBushAtlas(){
 const image=document.createElement('canvas');
 image.width=512;image.height=128; // power-of-two for WebGL1 mipmaps
 const c=image.getContext('2d');
 if(!c)throw Error('Bush foliage atlas needs Canvas2D');
 c.clearRect(0,0,512,128);
 // Painted for a top-down clumpy shelf, rather than an upright fan.
 // Rounded overlapping leaf masses form a cohesive alpha-cutout edge.
 const variants=[
  [[35,38,25,23,-.36],[67,29,30,25,.08],[93,43,24,26,.44],[104,78,24,24,.15],[71,97,30,24,-.15],[31,79,26,25,-.52]],
  [[36,36,26,27,-.30],[76,28,29,26,.15],[100,58,25,26,.55],[88,92,27,26,-.35],[47,96,27,22,.24],[23,65,23,25,-.10]],
  [[39,28,24,23,-.54],[69,34,31,26,.12],[98,48,26,25,.22],[98,84,27,26,.44],[63,98,29,24,-.12],[29,77,25,27,-.42]]
 ];
 const palette=[
  ['#b9d69b','#91bb82','#719d72'],
  ['#bfd89b','#99bc85','#78a178'],
  ['#b2d3a4','#8cb798','#6e9d81']
 ];
 for(let variant=0;variant<variants.length;variant++){
  c.save();c.translate(variant*128,0);
  const [light,mid,dark]=palette[variant],center=c.createLinearGradient(0,38,0,105);
  center.addColorStop(0,mid);center.addColorStop(1,dark);
  c.fillStyle=center;c.beginPath();c.ellipse(64,65,40,35,0,0,TAU);c.fill();
  for(let j=0;j<variants[variant].length;j++){
   const [x,y,rx,ry,rotation]=variants[variant][j],fill=c.createLinearGradient(0,y-ry,0,y+ry);
   fill.addColorStop(0,j%2===0?light:mid);fill.addColorStop(1,dark);
   c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();
  }
  c.fillStyle='rgba(247,255,226,.075)';
  c.beginPath();c.ellipse(54,55,27,17,-.3,0,TAU);c.fill();
  c.restore();
 }
 return image;
}

export const BUSH_TIERS=[
 {x:-.03,y:.25,z:.04,w:1.29,d:1.00,yaw:.15,roll:.010,pitch:-.020,droop:.16,variant:2,phase:.2,tint:.82},
 {x:.07,y:.40,z:-.07,w:1.44,d:1.15,yaw:-.44,roll:-.032,pitch:.018,droop:.17,variant:1,phase:1.4,tint:.92},
 {x:-.07,y:.55,z:.04,w:1.31,d:1.07,yaw:.55,roll:.025,pitch:-.020,droop:.15,variant:0,phase:2.7,tint:1.02},
 {x:.05,y:.70,z:.02,w:1.12,d:.93,yaw:-.27,roll:-.020,pitch:.015,droop:.13,variant:2,phase:4.1,tint:1.12},
 {x:0,y:.83,z:-.03,w:.85,d:.73,yaw:.18,roll:.012,pitch:-.025,droop:.105,variant:1,phase:5.5,tint:1.22}
] as const;

/** 2x2 production candidate: center + edge samples, 44 triangles.
 * 4x4 original reference: 164 triangles. Compare silhouettes before choosing.
 * Both include two stem cards in the same texture/material/draw.
 */
export function makeBushGeometry(steps:2|4=2):THREE.BufferGeometry{
 if(steps!==2&&steps!==4)throw new RangeError('Unsupported bush shelf grid');
 const pos:number[]=[],uv:number[]=[],color:number[]=[],wind:number[]=[],indices:number[]=[];
 const vertex=(x:number,y:number,z:number,u:number,v:number,phase:number,rim:number,tint:number)=>{
  pos.push(x,y,z);uv.push(u,v);wind.push(phase,rim);
  const shade=tint*(1-.13*rim);color.push(shade,shade,shade);
 };
 for(const tier of BUSH_TIERS){
  const base=pos.length/3,co=Math.cos(tier.yaw),si=Math.sin(tier.yaw);
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
   const u=i/steps,v=j/steps,x=(u-.5)*tier.w,z=(v-.5)*tier.d;
   const rim=Math.max(Math.abs(2*u-1),Math.abs(2*v-1));
   const t=Math.max(0,Math.min(1,(rim-.22)/.78)),smooth=t*t*(3-2*t);
   const y=tier.y+.024*(1-rim*rim)-tier.droop*Math.pow(smooth,1.2)+tier.roll*x+tier.pitch*z;
   vertex(tier.x+co*x+si*z,y,tier.z-si*x+co*z,(tier.variant+.046+u*.908)*.25,.035+v*.93,tier.phase,rim,tier.tint);
  }
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
   const a=base+j*(steps+1)+i,b=a+1,c=a+steps+1,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
 }
 for(let side=0;side<2;side++){
  const base=pos.length/3,a=side*Math.PI/2;
  for(const [along,up] of [[-1,0],[1,0],[-1,1],[1,1]])
   vertex(Math.cos(a)*.0375*along,.006+up*.41,-Math.sin(a)*.0375*along,.12,.51,0,0,.58);
  indices.push(base,base+1,base+2,base+2,base+1,base+3);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
 g.setAttribute('bushWind',new THREE.Float32BufferAttribute(wind,2));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();
 // Keep local x/z canopy inside the authored fixture envelope after scaling.
 const bounds=g.boundingBox!;
 g.scale(1/(bounds.max.x-bounds.min.x),1/bounds.max.y,1/(bounds.max.z-bounds.min.z));
 g.computeBoundingBox();
 const center=g.boundingBox!.getCenter(new THREE.Vector3());
 g.translate(-center.x,-g.boundingBox!.min.y,-center.z);
 g.computeBoundingBox();g.boundingBox!.expandByScalar(.03);
 g.computeBoundingSphere();g.boundingSphere!.radius+=.03;
 return g;
}

export function makeBushTexture():THREE.CanvasTexture{
 const t=new THREE.CanvasTexture(makeBushAtlas());
 t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;
 t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t;
}

/** Share this material for a scene, but retain separate fixture transforms
 * and disclosure owners. Explicit texture lifetime belongs to caller.
 */
export function makeBushMaterial(texture:THREE.Texture){
 const clock={value:0};
 const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,
  alphaTest:.48,transparent:false,depthWrite:true,roughness:1,metalness:0,vertexColors:true});
 material.onBeforeCompile=shader=>{
  shader.uniforms.fieldworkBushTime=clock;
  shader.vertexShader='attribute vec2 bushWind;\nuniform float fieldworkBushTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nfloat rooted=pow(clamp(bushWind.y,0.0,1.0),1.5);\nfloat wave=sin(fieldworkBushTime*.52+bushWind.x)*.012+sin(fieldworkBushTime*.74+bushWind.x*1.37)*.005;\ntransformed+=rooted*wave*vec3(1.0,.15,.55);');
 };
 material.customProgramCacheKey=()=> 'fieldwork-perplung-bush-v3';
 return {material,clock};
}
