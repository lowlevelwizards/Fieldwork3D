/** Exterior 3D site construction, separate from scene lifetime/camera/fog.
 * Collision is authored in worldgen; these meshes are presentation only.
 * Every site-specific transient material is registered for site teardown.
 */
import * as THREE from 'three';
import type {Site} from '../breach-site.ts';
import type {PixelSurface} from './pixel-materials.ts';
import type {PixelOverlay} from './pixel-overlays.ts';
import {W,H} from '../breach-core.ts';
import {outdoorVisualCondition} from '../worldgen/outdoor-condition.ts';
import {zonePixelSurface} from '../worldgen/pixel-surface-selection.ts';
import {exteriorZoneRenderLift,propertySurfaceCenterHeight,
 PROPERTY_SURFACE_THICKNESS} from './property-surface-elevation.ts';
import {overlayForZone} from './pixel-overlays.ts';
import {SITE_EXTERIOR_ZONE_COLORS,SITE_PROPERTY_SURFACE_COLORS}
 from './breach-site-surface-policy.ts';
import {planServiceDockBumpers} from '../worldgen/service-facade-program.ts';
import {planFacadeAwnings} from '../worldgen/facade-awnings.ts';
import {planPropertySurfaces} from '../worldgen/property-surfaces.ts';
import {planPublicStreet} from '../worldgen/public-street-layout.ts';
import {curbRampWedge,CURB_GROUND_LEVELS} from './curb-ramp-wedge.ts';
import {WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT}
 from '../breach-door-proportions.ts';

export type SiteExteriorBuildHost={
 root:THREE.Object3D;
 box:(parent:THREE.Object3D,x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material,cast?:boolean)=>THREE.Mesh;
 plane:(parent:THREE.Object3D,x:number,z:number,w:number,d:number,
  y:number,material:THREE.Material)=>THREE.Mesh;
 solid:(hex:number,roughness?:number,surface?:PixelSurface)=>THREE.Material;
 overlay:(kind:PixelOverlay)=>THREE.Material;
 track:(material:THREE.Material)=>THREE.Material;
 age:(hex:number,surface:PixelSurface|undefined)=>number;
};
export function buildSiteExterior(site:Site,host:SiteExteriorBuildHost):void{
    const age=host.age;
    const outdoors=outdoorVisualCondition(site);
    const earth=host.solid(age(site.layout==='courtyard'?0x69825e:0x607a58,'grass'),.9,'grass');
    const bounds=site.bounds??{minX:0,minY:0,maxX:W,maxY:H};
    const bw=bounds.maxX-bounds.minX,bh=bounds.maxY-bounds.minY;
    host.plane(host.root,(bounds.minX+bounds.maxX)/2,
      (bounds.minY+bounds.maxY)/2,bw,bh,-2,earth);
    const zoneColor=SITE_EXTERIOR_ZONE_COLORS;
    for(const zone of site.exteriorZones??[]){
      const ground=zonePixelSurface(zone.kind,outdoors);
      const lift=exteriorZoneRenderLift(zone.id);
      host.plane(host.root,zone.x,zone.y,zone.w,zone.h,-1.45+lift,
        host.solid(age(zoneColor[zone.kind],ground),.91,ground));
      // One cheap repeated layer per relevant exterior zone, no dynamic allocation.
      const overlay=overlayForZone(outdoors,zone.kind);
      if(overlay){
        const mark=host.plane(host.root,zone.x,zone.y,zone.w,zone.h,-1.42+lift,
          host.overlay(overlay));
        mark.castShadow=false;mark.receiveShadow=false;
      }
    }
    // Structural roofs are open-slat and translucent for tabletop cutaway.
    // Actual support posts are the collidable obstacles in site.cover.
    for(const structure of site.structures??[]){
      if(!['entry-canopy','porch-roof','service-awning'].includes(structure.kind))
        continue;
      const frame=host.solid(structure.kind==='service-awning'?0x59615e:
        structure.kind==='porch-roof'?0x86755d:0x727c76,.83,'wood');
      const roofMat=host.track(new THREE.MeshBasicMaterial({
        color:0x8b917e,transparent:true,
        opacity:.16,depthWrite:false,side:THREE.DoubleSide}));
      const roof=host.box(host.root,structure.x,WALL_VISUAL_HEIGHT+1,structure.y,
        structure.w,1.2,structure.h,roofMat,false);
      roof.castShadow=false;roof.receiveShadow=false;
      host.box(host.root,structure.x,WALL_VISUAL_HEIGHT-.5,structure.y-structure.h/2,
        structure.w,2.5,2.5,frame,false);
      host.box(host.root,structure.x,WALL_VISUAL_HEIGHT-.5,structure.y+structure.h/2,
        structure.w,2.5,2.5,frame,false);
      host.box(host.root,structure.x-structure.w/2,WALL_VISUAL_HEIGHT-.5,structure.y,
        2.5,2.5,structure.h,frame,false);
      host.box(host.root,structure.x+structure.w/2,WALL_VISUAL_HEIGHT-.5,structure.y,
        2.5,2.5,structure.h,frame,false);
      for(const f of [-.26,.26])
        host.box(host.root,structure.x+structure.w*f,WALL_VISUAL_HEIGHT,structure.y,
          2,1.8,structure.h,frame,false);
    }
    // A loading/service bumper is only shown when a REAL exterior
    // doorway faces an industrial service yard. Not a floating platform,
    // not a false operable loading dock, and never an extra collider.
    const dockRubber=host.solid(0x35403d,.95,'tire-rubber');
    const dockSteel=host.solid(0x778078,.86,'industrial-steel');
    const dockStripe=host.solid(0xc3a568,.86,'painted-metal');
    for(const dock of planServiceDockBumpers(site)){
      for(const side of [-1,1]){
        const offset=side*(dock.span/2+5.0);
        const x=dock.axis==='x'?dock.x+offset:
          dock.x+dock.outward*3;
        const z=dock.axis==='x'?dock.y+dock.outward*3:
          dock.y+offset;
        const width=dock.axis==='x'?5.5:4.7;
        const depth=dock.axis==='x'?4.7:5.5;
        host.box(host.root,x,9,z,width,18,depth,dockRubber,false);
        host.box(host.root,x,17,z,width+1,2,depth+1,dockSteel,false);
        host.box(host.root,x,5.6,z,width+1,1.7,depth+1,
          dockStripe,false);
      }
    }
    // Fixed architectural window overhangs are tied to physical glass spans.
    // Keep the canopy translucent for the tactical cutaway and never imply
    // an elevated traversable surface or a new line-of-fire barrier.
    const awningRoof=host.track(new THREE.MeshStandardMaterial({
      color:0x85867a,roughness:.87,metalness:.08,transparent:true,opacity:.33,
      depthWrite:false,side:THREE.DoubleSide}));
    const awningEdge=host.solid(0x5f6e6a,.83,'painted-metal');
    for(const awning of planFacadeAwnings(site)){
      const roof=host.box(host.root,awning.x,DOOR_CLEAR_VISUAL_HEIGHT+2.5,awning.y,
        awning.w,1.5,awning.h,awningRoof,false);
      roof.castShadow=false;roof.receiveShadow=false;
      const vertical=awning.w<awning.h;
      const edgeOffset=vertical?awning.w/2:awning.h/2;
      if(vertical){
        for(const x of [awning.x-edgeOffset,awning.x+edgeOffset])
          host.box(host.root,x,DOOR_CLEAR_VISUAL_HEIGHT+1.8,awning.y,2,2.2,awning.h,awningEdge,false);
      }else{
        for(const y of [awning.y-edgeOffset,awning.y+edgeOffset])
          host.box(host.root,awning.x,DOOR_CLEAR_VISUAL_HEIGHT+1.8,y,awning.w,2.2,2,awningEdge,false);
      }
    }
    const surfaceColor=SITE_PROPERTY_SURFACE_COLORS;
    // Exterior ground markings are legible construction details, not cover.
    // Sidewalk/path/curb/ramp markings overlap by design, but their top
    // planes must not coincide. Distinct narrow finish elevations prevent
    // moire and flashing without changing the tactical ground collider.
    // True low curb and sloping cut (visual only; movement stays 2D).
    // The sidewalk geometry has a matching hole for the cut, so the ramp
    // isn't buried beneath a full-height slab or rendered coplanar with it.
    const curbMaterial=host.track(new THREE.MeshStandardMaterial({
      color:age(0xa6a399,'concrete'),roughness:.96,
      metalness:0,flatShading:true,side:THREE.DoubleSide}));
    for(const mark of planPropertySurfaces(site)){
      if(mark.kind==='curb-ramp'){
        const wedge=curbRampWedge(mark,site.entrySide??'south');
        const geom=new THREE.BufferGeometry();
        geom.setAttribute('position',new THREE.Float32BufferAttribute(wedge.vertices,3));
        geom.setIndex(wedge.indices);
        geom.computeVertexNormals();
        const ramp=new THREE.Mesh(geom,curbMaterial);
        ramp.castShadow=false;ramp.receiveShadow=true;
        host.root.add(ramp);
        continue;
      }
      if(mark.kind==='curb-edge'){
        const thickness=CURB_GROUND_LEVELS.sidewalk-
          CURB_GROUND_LEVELS.road;
        host.box(host.root,mark.x,
          (CURB_GROUND_LEVELS.sidewalk+CURB_GROUND_LEVELS.road)/2,
          mark.y,mark.width,thickness,mark.depth,curbMaterial,false);
        continue;
      }
      host.box(host.root,mark.x,propertySurfaceCenterHeight(mark.kind),
        mark.y,mark.width,PROPERTY_SURFACE_THICKNESS,
        mark.depth,host.solid(age(surfaceColor[mark.kind],
          mark.kind==='planting-bed'?'packed-earth':
          mark.kind==='planting-edge'?'gravel':'concrete')),false);
    }
    // The public carriageway runs along the LOT boundary, not up the
    // pedestrian approach to the front door. One street layout also owns
    // sidewalks, curb cuts and worldgen street-exclusion checks.
    const street=planPublicStreet(site);
    if(street){
      const road=host.solid(age(0x595d59,'asphalt'),.94,'asphalt');
      host.box(host.root,street.road.x,-1.41,street.road.y,
        street.road.width,.24,street.road.depth,road,false);
    }

}
