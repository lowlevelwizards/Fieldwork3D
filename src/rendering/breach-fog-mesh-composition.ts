/** C2: physical mesh representation of the existing fog DISPLAY footprint.
 * Pure geometry creation, no live visibility, LOS, replay, or Session mutation.
 * The site swap owns disposal; FOW shading/texture/canvas owners remain in 3D.
 */
import * as THREE from 'three';
import {W,H} from '../breach-core.ts';
import type {Site,WorldBounds} from '../breach-site.ts';
import {exteriorKnownFogRects,fogUvAt} from '../breach-fog-domain.ts';

export function tacticalFogBounds(site:Site|null):WorldBounds{
  return site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
}

/** In Exterior Known, no 3D triangle exists above publicly accessible lawn,
 * sidewalk or open courtyard. The mesh and paint use ONE cached site footprint
 * (room union plus genuinely enclosed courts); the shared texture still owns
 * actual sight, exploration, fog tint and tactical disclosure. This prevents
 * a rectangular outdoor slab even if the canvas is repainted during a swap.
 * Construction happens only when a site changes, never per frame.
 */
export function buildExteriorKnownFogGeometry(
  site:Site|null,bounds:WorldBounds=tacticalFogBounds(site)
):THREE.BufferGeometry{
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  if(site){
    for(const rect of exteriorKnownFogRects(site)){
      const offset=positions.length/3;
      const corners=[
        {x:rect.x,y:rect.y},
        {x:rect.x,y:rect.y+rect.h},
        {x:rect.x+rect.w,y:rect.y+rect.h},
        {x:rect.x+rect.w,y:rect.y}
      ];
      for(const p of corners){
        positions.push(p.x,1.05,p.y);
        const uv=fogUvAt(p,bounds);
        uvs.push(uv.u,uv.v);
      }
      indices.push(offset,offset+1,offset+2,
        offset,offset+2,offset+3);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  if(positions.length)geometry.computeVertexNormals();
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
