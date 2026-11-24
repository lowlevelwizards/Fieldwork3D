/** V2 art atom — directly ported from Perplung Bush Study 04,
 * source 8ffb7a0b870cf7158b63a6796a916bac3c8f89b4, index.html.
 * No scene integration yet; the owning scene must release its texture and geometry.
 */
import * as THREE from 'three';
export const GRASS_ATLAS_WIDTH=512,GRASS_ATLAS_HEIGHT=128,GRASS_VARIANTS=4;
export function makeGrassAtlas(){
 const image=document.createElement('canvas');image.width=512;image.height=128;
 const c=image.getContext('2d');if(!c)throw Error('Foliage atlas needs Canvas2D');
 c.clearRect(0,0,512,128);
 const sets=[
  [[30,65,15],[46,45,13],[65,28,16],[86,48,13],[107,69,15]],
  [[31,66,16],[52,39,15],[71,29,14],[91,59,17]],
  [[27,72,15],[43,49,13],[61,35,15],[82,42,14],[105,70,14]],
  [[30,61,15],[48,35,13],[66,49,16],[83,32,14],[106,67,15]]
 ];
 const colors=[['#9cba79','#6f9760'],['#b9ca87','#87a66a'],
  ['#95b88b','#729c72'],['#c1ce96','#94ad73']];
 for(let variant=0;variant<4;variant++){
  c.save();c.translate(variant*128,0);
  for(let j=0;j<sets[variant].length;j++){
   const [originalTip,top,width]=sets[variant][j];
   // Open up the silhouette: tips fan outward ~18%, while the roots have
   // distinct points of attachment instead of all converging at x=64.
   // Keep the blade tip and rounded shoulders inside the padded UV region.
   const tip=Math.max(18,Math.min(110,64+(originalTip-64)*1.18));
   const base=64+(j-(sets[variant].length-1)/2)*7;
   const gradient=c.createLinearGradient(0,top,0,120);
   gradient.addColorStop(0,colors[variant][0]);
   gradient.addColorStop(1,colors[variant][1]);
   c.fillStyle=gradient;c.beginPath();
   c.moveTo(base-width*.39,120);
   c.bezierCurveTo(base-width*.55,94,tip-width*.60,top+17,tip-width*.44,top+width*.32);
   c.quadraticCurveTo(tip,top-width*.20,tip+width*.44,top+width*.32);
   c.bezierCurveTo(tip+width*.60,top+17,base+width*.55,95,base+width*.39,120);
   c.closePath();c.fill();
   c.strokeStyle='rgba(244,255,211,.11)';c.lineWidth=2;
   c.beginPath();c.moveTo(base,111);
   c.quadraticCurveTo((base+tip)*.5,top+28,tip,top+width*.58);c.stroke();
  }
  c.restore();
 }
 return image;
}

/** One atlas, opaque alpha cutout, not sorted transparency. */
export function makeGrassTexture():THREE.CanvasTexture{
 const texture=new THREE.CanvasTexture(makeGrassAtlas());
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;
 return texture;
}
/** Four triangles, root at y=0, same padded UV bounds as Perplung.
 * Variant is baked in the UVs for the prototype; production uses a
 * per-instance variant attribute so all four share one patch draw.
 */
export function makeGrassCrossCard(variant:number):THREE.BufferGeometry{
 if(!Number.isInteger(variant)||variant<0||variant>=GRASS_VARIANTS)
  throw new RangeError('Invalid grass atlas variant');
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute([
  -.5,0,0,.5,0,0,-.5,1,0,.5,1,0,
  0,0,-.5,0,0,.5,0,1,-.5,0,1,.5],3));
 const uv:number[]=[];
 for(let i=0;i<8;i++){
  const x=i%2,y=Math.floor(i%4/2);
  uv.push((variant+.05+x*.90)*.25,.04+y*.92);
 }
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex([0,1,2,2,1,3,4,5,6,6,5,7]);
 g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 return g;
}
