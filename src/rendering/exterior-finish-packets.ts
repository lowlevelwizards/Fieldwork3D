/** Site-owned flat ground paint packets. Preserve material identity,
 * local culling and exact top elevations. No mutable fixture ownership. */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mapPlanePixelUV} from './pixel-materials.ts';
import type {PropertySurface} from '../worldgen/property-surfaces.ts';
import {propertySurfaceCenterHeight,PROPERTY_SURFACE_THICKNESS} from './property-surface-elevation.ts';
const flatKinds=new Set(['amenity-apron','work-wear','pavement-joint','parking-divider',
 'driveway-stripe','stall-end-line','access-hatch','crosswalk-stripe','garden-border',
 'waste-bay-line','utility-bay-line','loading-bay-line','clear-route',
 'street-verge','street-shoulder','road-patch','road-manhole','street-drain','sidewalk-joint','road-centerline','road-edge-line','street-driveway-link']);
export const isFlatExteriorFinish=(kind:PropertySurface['kind'])=>flatKinds.has(kind);
export class ExteriorFinishPackets{
 private readonly buckets=new Map<THREE.Material,Map<string,THREE.BufferGeometry[]>>();
 add(mark:PropertySurface,material:THREE.Material){
  const y=propertySurfaceCenterHeight(mark.kind)+PROPERTY_SURFACE_THICKNESS/2;
  const geom=mark.kind==='road-manhole'?new THREE.CircleGeometry(mark.width/2,8):mapPlanePixelUV(new THREE.PlaneGeometry(mark.width,mark.depth),
   mark.width,mark.depth,mark.x,mark.y);
  geom.rotateX(-Math.PI/2);geom.translate(mark.x,y,mark.y);
  const key=Math.floor(mark.x/220)+':'+Math.floor(mark.y/220);
  let cells=this.buckets.get(material);
  if(!cells){cells=new Map();this.buckets.set(material,cells);}
  const parts=cells.get(key)??[];parts.push(geom);cells.set(key,parts);
 }
 flush(root:THREE.Object3D){
  let marks=0,packets=0;
  for(const [material,cells] of this.buckets)for(const parts of cells.values()){
   marks+=parts.length;
   const combined=parts.length===1?parts[0]:mergeGeometries(parts,false);
   const geometries=combined?[combined]:parts;
   if(combined&&parts.length>1)for(const part of parts)part.dispose();
   for(const geometry of geometries){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.castShadow=false;mesh.receiveShadow=true;
    mesh.userData.fieldworkDrawFamily='exterior-ground-finish';
    root.add(mesh);packets++;
   }
  }
  this.buckets.clear();return {marks,packets};
 }
}
