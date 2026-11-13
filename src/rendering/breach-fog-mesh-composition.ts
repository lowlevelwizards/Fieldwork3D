/** C2: physical mesh representation of the existing fog DISPLAY footprint.
 * Pure geometry creation, no live visibility, LOS, replay, or Session mutation.
 * The site swap owns disposal; FOW shading/texture/canvas owners remain in 3D.
 */
import * as THREE from 'three';
import {W,H} from '../breach-core.ts';
import type {Site,WorldBounds} from '../breach-site.ts';
import {fogUvAt} from '../breach-fog-domain.ts';

export function tacticalFogBounds(site:Site|null):WorldBounds{
  return site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
}

/** Exterior Known uses the SAME world-aligned mask as the 2D renderer.
 * The canvas already erases reachable exterior and preserves indoor rooms and
 * enclosed courts. A second room-rectangle geometry clipping pass can leave
 * missing fog patches wherever the two spatial classifications disagree
 * (notably at open U-shaped shipping courts and connected floor modules).
 * One physical ground quad lets the authoritative DISPLAY alpha decide.
 * This never changes optical LOS, ground discovery, or tactical intelligence.
 */
export function buildExteriorKnownFogGeometry(
  site:Site|null,bounds:WorldBounds=tacticalFogBounds(site)
):THREE.BufferGeometry{
  const positions:number[]=[],uvs:number[]=[];
  if(site){
    const corners=[
      {x:bounds.minX,y:bounds.minY},
      {x:bounds.minX,y:bounds.maxY},
      {x:bounds.maxX,y:bounds.maxY},
      {x:bounds.maxX,y:bounds.minY}
    ];
    for(const p of corners){
      positions.push(p.x,1.05,p.y);
      const uv=fogUvAt(p,bounds);
      uvs.push(uv.u,uv.v);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(site?[0,1,2,0,2,3]:[]);
  if(site)geometry.computeVertexNormals();
  return geometry;
}

/** Only these two site-dependent meshes change: retain their shared fog
 * material, CanvasTexture, scene-node identity, depth policy and render order.
 */
export function replaceTacticalFogGeometry(
  smoothFog:THREE.Mesh,exteriorKnownFog:THREE.Mesh,site:Site|null
):WorldBounds{
  const bounds=tacticalFogBounds(site);
  const oldSmooth=smoothFog.geometry;
  const oldExterior=exteriorKnownFog.geometry;
  smoothFog.geometry=new THREE.PlaneGeometry(
    bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  smoothFog.position.set((bounds.minX+bounds.maxX)/2,
    1.05,(bounds.minY+bounds.maxY)/2);
  exteriorKnownFog.geometry=buildExteriorKnownFogGeometry(site,bounds);
  oldSmooth.dispose();
  if(oldExterior!==oldSmooth)oldExterior.dispose();
  return bounds;
}
