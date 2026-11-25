/** Site-only 3D construction. The live scene supplies renderer-owned caches and
 * lifetime collections through an explicit port; no tactical state is edited.
 * Coordinates: tactical (x,y) -> Three (x,height,z=y).
 */
import * as THREE from 'three';
import {type Site,type Room,type WideOpening} from '../breach-site.ts';
import {W,H,WALLS,COVER,initialDoors,doorCenter,type Pt,type Segment} from '../breach-core.ts';
import {initDoor} from '../breach-door.ts';
import {doorProportions,DOOR_PANEL_END_RECESS,DOOR_FRAME_INSET,
 WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT,DOOR_LEAF_VISUAL_HEIGHT} from '../breach-door-proportions.ts';
import {buildDoorHardwareVisual,type BrokenDoorHardwareVisual}
 from './breach-door-broken-hardware-visual.ts';
import {buildArchitecturalOpenings,buildSiteDoors,buildSiteWindows,doorSweepArc,
 type SiteOpeningsHost} from './breach-site-openings-builder.ts';
import {buildSiteExterior} from './breach-site-exterior-builder.ts';
import {buildSiteMicroDebrisMeshes} from './breach-site-micro-debris.ts';
import {SiteMaterialLifetime} from './site-material-lifetime.ts';
import {StaticSceneBatches} from './breach-static-batcher.ts';
import {type PixelSurface} from './pixel-materials.ts';
import {roomPixelSurface,wallPixelSurface,fixturePixelSurface} from '../worldgen/pixel-surface-selection.ts';
import {buildingTheme,roomFloor,roomFixtureFinishes,roomAccessoryColor} from '../worldgen/building-palettes.ts';
import {effectiveCondition} from '../worldgen/condition-visual.ts';
import {conditionFloorPixels} from '../worldgen/condition-visual.ts';
import {buildFloorMaskAtlas,floorMaskGeometry,floorMaskMaterial,type FloorMaskSlot} from './floor-surface-atlas.ts';
import {conditionWallPixels,wallPatinaDimensions} from '../worldgen/condition-wall.ts';
import {planWallTrimPackets,compileWallTrimGeometry,compileUnifiedWallGeometry,restrictWallShadowToBody} from './wall-structural-packet.ts';
import {planWallCapJoins} from './wall-cap-joins.ts';
import {ageMaterialColor} from './condition-materials.ts';
import {doubleSidedWallWear} from './wear-wall-geometry.ts';
import {planWallSurface,packedWallSurfacePixels,type WallAudition,type WallSurfaceRecipe} from '../worldgen/wall-surface-recipe.ts';
import {buildWallAtlas,type WallAtlasSlot} from './wall-surface-atlas.ts';
import {wearPixels} from './pixel-decals.ts';
import {projectFixtureWear} from './fixture-wear-projection.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './wear-opacity.ts';
import {type PixelOverlay} from './pixel-overlays.ts';
import {type PixelSignKind} from './pixel-signage.ts';
import {planObjectWear,type ObjectWear} from '../worldgen/object-wear.ts';
import {planExposureWear} from '../worldgen/wear-exposure.ts';
import {type WearKind,type WearMark} from '../worldgen/environment-wear.ts';
import {planStaticFloorWear,planCompiledFloorWear,FLOOR_WEAR_COLOR} from '../worldgen/floor-wear-plan.ts';
import {planInteriorFragments,type InteriorFragment} from '../worldgen/interior-fragments.ts';
import {visibleSurfaceHeight} from '../worldgen/decoration-anchors.ts';
import {renderFixtureVisual,type FixtureVisualContext} from '../worldgen/fixture-visuals.ts';
import {consolidateStaticFixtureParts} from './breach-fixture-draw-batching.ts';
import {acquireVehicleTemplate,createVehicleMaterial} from '../worldgen/vehicle-visual.ts';
import {vehicleFamily} from '../worldgen/vehicle-catalog.ts';
import {acquireRigidFixtureTemplate,adoptRigidFixtureVisual}
 from './breach-fixture-template.ts';
import {consolidateOwnedStaticSiteDetails} from './breach-owner-static-merge.ts';
import {compileRigidVisualOwner} from './fieldwork-model-compiler.ts';
import {StaticVisualTemplateLibrary,type StaticVisualLease}
 from './fieldwork-visual-template-library.ts';
import type {RepeatedFixtureBatches} from './breach-repeated-fixture-batches.ts';
import {isArchitecturalSillCover} from '../worldgen/architectural-cover-visuals.ts';
import {accessibleExteriorWall} from '../breach-site-footprint.ts';
import {sitePowerControls} from '../equipment-site-power-controls.ts';

export type SiteSceneBuildPort={
 root:THREE.Group;
 box:(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,
   d:number,material:THREE.Material,cast?:boolean,packedWall?:boolean,atlasSlot?:WallAtlasSlot)=>THREE.Mesh;
 plane:(parent:THREE.Object3D,x:number,z:number,w:number,d:number,
   y:number,material:THREE.Material)=>THREE.Mesh;
 solid:(hex:number,roughness?:number,surface?:PixelSurface)=>THREE.MeshStandardMaterial;
 groundOverlayMaterial:(kind:PixelOverlay)=>THREE.MeshBasicMaterial;
 signMaterial:(kind:PixelSignKind,variant?:number)=>THREE.MeshBasicMaterial;
 addSurfaceWear:(parent:THREE.Object3D,mark:ObjectWear,
   x:number,y:number,z:number,surface:PixelSurface)=>void;
 staticBatches:StaticSceneBatches;
 repeatedFixtures?:RepeatedFixtureBatches;
 sharedBoxGeometries:Set<THREE.BufferGeometry>;
 visualTemplates?:StaticVisualTemplateLibrary;
 fixtureTemplates?:StaticVisualTemplateLibrary;
 vehicleTemplates?:StaticVisualTemplateLibrary;
 includeServiceFixtureTemplates?:boolean;
 /** V3 audition: owner-local exterior shrub replacement only. */
 previewBush?:(parent:THREE.Group,width:number,height:number,depth:number)=>void;
 registerVisualLease?:(lease:StaticVisualLease)=>void;
 siteMaterials:SiteMaterialLifetime<THREE.Material>;
 mats:THREE.Material[];
 walls:Array<{mesh:THREE.Mesh;mid:Pt;segment:Segment;index:number;exterior:boolean}>;
 doors:Map<string,{root:THREE.Group;leaf:THREE.Group;frame:THREE.Group;
   halo:THREE.Group;threshold:THREE.Mesh;wedge:THREE.Mesh;
   glassPane?:THREE.Mesh}&BrokenDoorHardwareVisual>;
 observedDoorOpen:Map<string,number>;
 observedDoorGlass:Map<string,boolean>;
 windowGlass:Map<string,THREE.Mesh>;
 architecturalOpenings:Array<{obj:THREE.Object3D;opening:WideOpening}>;
 intelSurfaces:Array<{obj:THREE.Object3D;kind:'wall'|'cover';index:number}>;
 observedDetails:Array<{obj:THREE.Object3D;position:Pt;microKey:string;fineKey:string}>;
 roofGroups:Map<string,THREE.Group>;
 roofMaterial:THREE.MeshStandardMaterial|null;
 windowPaneMaterial:THREE.MeshStandardMaterial|null;
 patinaRoomSurfaces:Array<{room:Room;texture:THREE.DataTexture;floorSlot?:FloorMaskSlot}>;
 floorWearCompiled?:boolean;
 fixtureWearStrength?:{value:number};
 pendingFixtureWear?:Array<()=>void>;
 retiredFixtureWearGeometry?:Set<THREE.BufferGeometry>;
 patinaWallSurfaces:Array<{index:number;texture:THREE.DataTexture;recipe?:WallSurfaceRecipe;patterned?:boolean;atlasSlot?:WallAtlasSlot}>;
 wallAudition?:WallAudition;
 wallStructureCompiled?:boolean;
 wallStructureUnified?:boolean;
 wallDepthOpaque?:boolean;
 sitePatinaTextures:THREE.DataTexture[];
 sitePatinaMaterials:THREE.MeshBasicMaterial[];
 wallMaterials:Set<THREE.Material>;
 wearMaterials:Map<string,THREE.MeshBasicMaterial>;
 wearTextures:Map<WearKind,THREE.DataTexture>;
 wearBoost:number;
 currentWear:WearMark[];
 objectWear:ObjectWear[];
 coverGroups:Map<number,THREE.Group>;
 coverVisualStates:Map<number,{intact:THREE.Group;debris:THREE.Group}>;
};

/** Batch only site-static decoration and door frames, not interactive parts. */
export function finalizeStaticSiteBatches(host:SiteSceneBuildPort):void {
    host.root.updateWorldMatrix(true,true);
    for(const detail of host.observedDetails)
      host.staticBatches.collect(detail.obj,detail.obj,
        host.sharedBoxGeometries);
    for(const door of host.doors.values())
      host.staticBatches.collect(door.root,door.frame,
        host.sharedBoxGeometries,new Set([door.threshold,door.wedge]));
    host.staticBatches.flush(host.root);
    // E6.18: preserve the existing cross-owner instancing first, then
    // merge ONLY residual rigid geometry under the same disclosure owner.
    // Diagnostic URL override is used solely for deterministic A/B evidence.
    const e618Enabled=typeof location==='undefined'||
      new URLSearchParams(location.search).get('e618Batch')!=='0';
    if(e618Enabled)consolidateOwnedStaticSiteDetails(
      host.observedDetails,host.doors);
    // E6.20: verified fixed-seed production default. URL =0 is an
    // emergency rollback flag; all source draw/fog ownership stays intact.
    const e620Enabled=typeof location==='undefined'||
      new URLSearchParams(location.search).get('e620Bake')!=='0';
    if(e620Enabled){
      let source=0,compiled=0,windows=0,frames=0;
      for(const glass of host.windowGlass.values()){
        const owner=glass.parent;
        if(!owner||owner.userData.fogFacade!==true)continue;
        const result=compileRigidVisualOwner(owner,{
          mode:'opaque-facade',exclude:new Set([glass])});
        if(result.avoidedDraws>0){
          windows++;source+=result.sourceMeshes;compiled+=result.compiledMeshes;
        }
      }
      for(const door of host.doors.values()){
        const result=compileRigidVisualOwner(door.frame,{
          mode:'opaque-facade',exclude:new Set([door.threshold,door.wedge])});
        if(result.avoidedDraws>0){
          frames++;source+=result.sourceMeshes;compiled+=result.compiledMeshes;
        }
      }
      host.root.userData.fieldworkE620Pilot={source,compiled,
        avoided:source-compiled,windows,frames};
    }
    // E6.21: second verified domain, enabled by default. These groups move as one rigid
    // assembly or remain under their independent disclosure owner. A door
    // leaf's parent may rotate, but its local submesh geometry is rigid.
    // Never bake independently animated glass, thresholds or door hinges.
    const e621Enabled=typeof location==='undefined'||
      new URLSearchParams(location.search).get('e621Bake')!=='0';
    if(e621Enabled){
      let source=0,compiled=0,arches=0,interiorWindows=0;
      let interiorFrames=0,rigidLeaves=0;
      const record=(result:ReturnType<typeof compileRigidVisualOwner>,
       domain:'arch'|'window'|'frame'|'leaf')=>{
        if(result.avoidedDraws<=0)return;
        source+=result.sourceMeshes;compiled+=result.compiledMeshes;
        if(domain==='arch')arches++;
        else if(domain==='window')interiorWindows++;
        else if(domain==='frame')interiorFrames++;
        else rigidLeaves++;
      };
      // One room-opening group is independently discovered, not a global
      // structural mesh. Its parts share one material and stay rigid.
      for(const opening of host.architecturalOpenings)
        record(compileRigidVisualOwner(opening.obj,{mode:'opaque'}),'arch');
      for(const glass of host.windowGlass.values()){
        const owner=glass.parent;
        if(!owner||owner.userData.fogFacade===true)continue;
        record(compileRigidVisualOwner(owner,{mode:'opaque',
          exclude:new Set([glass])}),'window');
      }
      for(const door of host.doors.values()){
        const exterior=door.frame.children.some(child=>
          child.userData.fogFacade===true);
        if(!exterior)record(compileRigidVisualOwner(door.frame,{
          mode:'opaque',exclude:new Set([door.threshold,door.wedge])}),'frame');
        // Parts of an open/closed door travel together WITH the leaf pivot.
        // The glass pane retains its independent shattered/hidden state.
        record(compileRigidVisualOwner(door.leaf,{
          mode:exterior?'opaque-facade':'opaque',
          exclude:new Set([door.intactHardware,
            ...(door.glassPane?[door.glassPane]:[])])
        }),'leaf');
      }
      host.root.userData.fieldworkE621Pilot={source,compiled,
        avoided:source-compiled,arches,interiorWindows,
        interiorFrames,rigidLeaves};
    }
    // W5: retain the proven E6.20/21 rigid assembly compiler. After it
    // finishes, restore opaque facade materials to the ordinary depth pass.
    // Only site-owned promoted clones qualify, never glass or wear overlays.
    if(host.wallDepthOpaque){
      const converted=new Set<THREE.Material>();
      host.root.traverse(node=>{
        if(!(node instanceof THREE.Mesh)||Array.isArray(node.material)||
          node.userData.fieldworkTransparencyRole!=='known-exterior-detail')return;
        const m=node.material;
        if(m.opacity!==1||!m.depthTest||!m.depthWrite||m.alphaTest!==0||m.alphaHash||m.blending!==THREE.NormalBlending)return;
        if(!converted.has(m)){m.transparent=false;m.needsUpdate=true;converted.add(m);}
        node.userData.fogFacade=true;
        node.userData.fieldworkTransparencyRole='opaque';
        node.renderOrder=0;
      });
      host.root.userData.fieldworkW5OpaqueFacadeMaterials=converted.size;
    }
    // Bake immobile exterior/ground fixtures per spatial cell. Keep owner-
    // scoped doors, cover and fog groups independent; never touch descendants.
    consolidateStaticFixtureParts(host.root,{recursive:false,cellSize:220});
    host.repeatedFixtures?.flush(host.root,new Set([
      ...host.sharedBoxGeometries,
      ...(host.fixtureTemplates?.sharedGeometries()??[]),
      ...(host.vehicleTemplates?.sharedGeometries()??[])]));
    // Preserve exact existing cross-owner instance membership before adding
    // unique fixture UVs. An owner with detached parts is not a safe ray target.
    for(const apply of host.pendingFixtureWear??[])apply();
    if(host.pendingFixtureWear)host.pendingFixtureWear.length=0;
    if(host.retiredFixtureWearGeometry?.size){
      host.root.traverse(node=>{if(node instanceof THREE.Mesh)host.retiredFixtureWearGeometry!.delete(node.geometry);});
      for(const geometry of host.retiredFixtureWearGeometry)geometry.dispose();
      host.retiredFixtureWearGeometry.clear();
    }
}

/** Own no resources; renderer's material/scene lifetime remains authoritative. */
function buildSiteMicroDebris(site:Site,host:SiteSceneBuildPort):void {
    for(const mesh of buildSiteMicroDebrisMeshes(site,
      (hex,roughness,surface)=>host.solid(hex,roughness,surface)))
      host.root.add(mesh);
}

/** Generated-site construction, materials and reveal-registration in one home. */
export function buildGeneratedSite(site:Site,host:SiteSceneBuildPort):void {
    const theme=buildingTheme(site.archetype,site.seed);
    const finishCondition=effectiveCondition(site);
    const age=(hex:number,surface:PixelSurface|undefined,variation=0)=>
      ageMaterialColor(hex,surface,finishCondition,variation);
    buildSiteExterior(site,{
      root:host.root,
      box:(...args)=>host.box(...args),
      plane:(...args)=>host.plane(...args),
      solid:(...args)=>host.solid(...args),
      overlay:kind=>host.groundOverlayMaterial(kind),
      track:material=>host.siteMaterials.track(material),
      age:(hex,surface)=>age(hex,surface)
    });
    host.objectWear=[...planObjectWear(site),...planExposureWear(site)];
    // O(wear + actual marks) rather than rescanning every mark for every
    // wall and fixture. Built once during site/3D scene construction; none
    // of this touches a frame, tactical collider, or replay authority.
    const wearByOwner=new Map<string,ObjectWear[]>();
    for(const mark of host.objectWear){
      const key=mark.owner+':'+mark.index;
      let marks=wearByOwner.get(key);
      if(!marks){marks=[];wearByOwner.set(key,marks);}
      marks.push(mark);
    }
    const marksOn=(owner:ObjectWear['owner'],index:number)=>
      wearByOwner.get(owner+':'+index)??[];
    buildSiteMicroDebris(site,host);
    const decorativeRoomGroups=new Map<string,THREE.Group>();
    host.currentWear=host.floorWearCompiled?planCompiledFloorWear(site):planStaticFloorWear(site);
    const floorAtlas=host.floorWearCompiled?buildFloorMaskAtlas(site,effectiveCondition(site),host.currentWear,host.wearBoost):undefined;
    if(floorAtlas)host.sitePatinaTextures.push(...floorAtlas.pages);
    const floorMaterials=new Map<string,THREE.MeshStandardMaterial>();
    for(const room of site.rooms){
      const group=new THREE.Group();
      decorativeRoomGroups.set(room.id,group);host.root.add(group);
      // A floor remains physically present. Only the actual vision/memory
      // mask reveals its cells, never an entire rectangular room at once.
      const floorType=roomPixelSurface(site.archetype,room.purpose??room.kind);
      const base=host.solid(room.kind==='hall'?theme.hall:
        roomFloor(theme,room.purpose,room.tone),.92,floorType);
      // Connected blueprint cells make one continuous physical floor surface.
      // Legacy floor inset stays unchanged for historical visual parity.
      const floorInset=site.programLocked?0:2;
      const slot=floorAtlas?.slots.get(room.id);
      if(slot){
        const key=base.uuid+':'+slot.texture.uuid;
        let material=floorMaterials.get(key);
        if(!material){
          material=floorMaskMaterial(base,slot.texture);
          host.siteMaterials.track(material);
          floorMaterials.set(key,material);
        }
        const floor=new THREE.Mesh(floorMaskGeometry(room.w-floorInset,1.6,room.h-floorInset,slot),material);
        floor.position.set(room.x+room.w/2,-.8,room.y+room.h/2);
        floor.castShadow=false;floor.receiveShadow=true;
        floor.userData.fieldworkDrawFamily='room-floor-compiled';
        group.add(floor);
        host.patinaRoomSurfaces.push({room,texture:slot.texture,floorSlot:slot});
      }else host.box(group,room.x+room.w/2,-.8,room.y+room.h/2,
        room.w-floorInset,1.6,room.h-floorInset,base,false);
      // One whole-surface spatial aging field: rooms transform before decals.
      // Each room uses a small seeded map, with edge/fixture influences.
      if(!slot&&effectiveCondition(site)>0){
        const texture=new THREE.DataTexture(conditionFloorPixels(site,room),64,64,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps=true;texture.needsUpdate=true;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        host.sitePatinaTextures.push(texture);host.sitePatinaMaterials.push(material);
        host.patinaRoomSurfaces.push({room,texture});
        const overlay=host.plane(group,room.x+room.w/2,room.y+room.h/2,
          room.w-floorInset,room.h-floorInset,.04,material);
        overlay.castShadow=false;overlay.receiveShadow=false;
        overlay.userData.fieldworkDrawFamily='room-floor-weathering';
        overlay.userData.fieldworkTransparencyRole='room-floor-weathering';
      }
      // Pixel tile/board joints are already in the shared repeating texture.
      // Avoid redundant grout meshes and draw calls.
    }
    // Sparse, instanced fragments collect against physical room boundaries.
    // These are tiny render-only fragments, never new cover or navigation.
    const fragments=planInteriorFragments(site);
    const fragmentMaterial=host.solid(0x9b8e78,.98,'gravel');
    const fragmentGeometry=new THREE.BoxGeometry(1,1,1);
    const transform=new THREE.Object3D();
    // Group fragment instances once, instead of rescanning the complete
    // fragment list for every separate floor rectangle on large maps.
    const fragmentsByRoom=new Map<string,typeof fragments>();
    for(const fragment of fragments){
      const group=fragmentsByRoom.get(fragment.roomId)??[];
      group.push(fragment);fragmentsByRoom.set(fragment.roomId,group);
    }
    // A fixed color palette instead of a THREE.Color allocation for each
    // fragment instance. Instancing, batches and fog groups are unchanged.
    const fragmentColors:Record<InteriorFragment['kind'],THREE.Color>={
      flake:new THREE.Color(0xb6a893),dust:new THREE.Color(0x8b816d),
      plaster:new THREE.Color(0xc9bbaa),leaf:new THREE.Color(0x647257),
      paper:new THREE.Color(0xe3dccc),glass:new THREE.Color(0x8fbac0)
    };
    for(const room of site.rooms){
      const entries=fragmentsByRoom.get(room.id)??[];
      if(!entries.length)continue;
      const group=decorativeRoomGroups.get(room.id);if(!group)continue;
      const batch=new THREE.InstancedMesh(fragmentGeometry,fragmentMaterial,entries.length);
      batch.frustumCulled=false;batch.castShadow=false;batch.receiveShadow=false;
      for(const [i,f] of entries.entries()){
        transform.position.set(f.x,.65,f.y);
        transform.rotation.set(0,f.angle,0);
        transform.scale.set(f.size,.5,f.size*.6);
        transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);
        batch.setColorAt(i,fragmentColors[f.kind]);
      }
      batch.instanceMatrix.needsUpdate=true;
      if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
      group.add(batch);
    }
    if(!fragments.length)fragmentGeometry.dispose();
    // Condition-dependent floor patina stays inside its room's fog group.
    // Decals are decorative only; they create no collision or cover.
    for(const detail of floorAtlas?[]:host.currentWear){
      const roomGroup=decorativeRoomGroups.get(detail.roomId);
      if(!roomGroup)continue;
      const bucket=wearOpacityBucket(detail.opacity);
      const wearKey=detail.kind+':'+bucket;
      let material=host.wearMaterials.get(wearKey);
      if(!material){
        let texture=host.wearTextures.get(detail.kind);
        if(!texture){
          texture=new THREE.DataTexture(wearPixels(detail.kind),32,32,THREE.RGBAFormat);
          texture.colorSpace=THREE.SRGBColorSpace;
          texture.magFilter=THREE.NearestFilter;
          texture.minFilter=THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps=true;
          texture.needsUpdate=true;
          host.wearTextures.set(detail.kind,texture);
        }
        material=new THREE.MeshBasicMaterial({
          color:FLOOR_WEAR_COLOR[detail.kind],map:texture,transparent:true,
          opacity:Math.min(1,WEAR_ALPHA_BANDS[bucket]*host.wearBoost),
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        host.wearMaterials.set(wearKey,material);
        host.mats.push(material);
      }
      const patch=host.plane(roomGroup,detail.x,detail.y,
        detail.width,detail.depth,.09,material);
      patch.rotation.z=detail.rotation;
      patch.castShadow=false;patch.receiveShadow=false;
    }
    // Light, room-aware roof slabs for known but unoccupied interiors.
    // Unknown rooms have NO roof geometry exposed above the ground fog.
    if(!host.roofMaterial){
      host.roofMaterial=new THREE.MeshStandardMaterial({
        color:theme.cap,roughness:.95,transparent:true,
        opacity:.21,depthWrite:false,side:THREE.DoubleSide});
      host.mats.push(host.roofMaterial);
    }else host.roofMaterial.color.setHex(theme.cap);
    // Camera cutaway roofs are independent of fog-of-war discovery.
    // Removing one to see a friendly does NOT reveal unseen floor cells.
    for(const room of site.rooms){
      const roof=new THREE.Group();
      roof.visible=false;host.root.add(roof);
      host.roofGroups.set(room.id,roof);
      const slab=host.box(roof,room.x+room.w/2,WALL_VISUAL_HEIGHT+3,room.y+room.h/2,
        Math.max(12,room.w+2),2,Math.max(12,room.h+2),
        host.roofMaterial,false);
      slab.receiveShadow=false;
      slab.userData.fieldworkDrawFamily='room-roof';
      slab.userData.fieldworkTransparencyRole='room-roof';
    }
    const wallMat=host.solid(age(theme.wall,wallPixelSurface(site.archetype)),.94,wallPixelSurface(site.archetype)),
      capMat=host.solid(theme.cap,.94,'concrete');
    const skirting=host.solid(theme.trim,.91,'painted-wood');
    // These known exterior frames must compose AFTER the ground-aligned
    // concealment overlay. Clone shared opaque materials once per site:
    // otherwise promoting a window sill would also expose interior props.
    // Every clone is retired by siteMaterials.reset() on mission swap.
    const facadeMaterialCache=new Map<THREE.Material,THREE.Material>();
    const promoteFacadeDetails=(group:THREE.Object3D)=>{
      group.traverse(node=>{
        if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
        const original=node.material;
        if(!original.transparent){
          let material=facadeMaterialCache.get(original);
          if(!material){
            material=host.siteMaterials.track(original.clone());
            material.transparent=true;
            material.needsUpdate=true;
            facadeMaterialCache.set(original,material);
          }
          node.material=material;
        }
        node.userData.fogFacade=true;
        node.userData.fieldworkDrawFamily='known-exterior-detail';
        node.userData.fieldworkTransparencyRole=original.transparent?
          'facade-existing-translucent':'known-exterior-detail';
        node.renderOrder=1002;
      });
    };
    const atlas=host.wallAudition?.atlas?buildWallAtlas(site,WALL_VISUAL_HEIGHT,finishCondition,host.wallAudition.effect,!!host.solid(theme.wall,.94,wallPixelSurface(site.archetype)).map,host.wallStructureUnified?{trim:theme.trim,cap:theme.cap}:undefined,host.wallAudition.story):undefined;
    if(atlas)host.sitePatinaTextures.push(...atlas.pages);
    const capJoins=planWallCapJoins(site.walls);
    const unified=!!host.wallStructureUnified&&!!atlas;
    const compiledTrim=(!!host.wallStructureCompiled||unified)&&!!atlas;
    const trimPackets=compiledTrim?planWallTrimPackets(site.walls,WALL_VISUAL_HEIGHT,theme.trim,theme.cap,capJoins):[];
    const wallGroups:THREE.Group[]=[];
    for(const [index,wall] of site.walls.entries()){
      const group=new THREE.Group();host.root.add(group);
      wallGroups[index]=group;
      host.intelSurfaces.push({obj:group,kind:'wall',index});
      const {a,b}=wall,len=Math.hypot(b.x-a.x,b.y-a.y);
      if(len<5)continue;
      const exterior=accessibleExteriorWall(site,wall);
      const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
      const angle=-Math.atan2(b.y-a.y,b.x-a.x);
      const individualWall=(host.wallAudition?host.solid(theme.wall,.94,wallPixelSurface(site.archetype)):wallMat).clone();
      host.wallMaterials.add(individualWall);
      const atlasSlot=atlas?.slots.get(index);
      const body=host.box(group,x,WALL_VISUAL_HEIGHT/2,z,
        len,WALL_VISUAL_HEIGHT,9,individualWall,true,!!host.wallAudition,atlasSlot);
      body.rotation.y=angle;
      body.userData.fieldworkDrawFamily='structural-wall-body';
      // Dynamic reason is assigned by the existing cutaway loop.
      // Whole-wall weathering follows the actual structural wall mesh.
      // Both faces share one deterministic texture, while a single instance
      // controls opacity during close-camera cutaways.
      if(atlasSlot){
        individualWall.map=atlasSlot.texture;individualWall.color.setHex(0xffffff);individualWall.needsUpdate=true;
        host.patinaWallSurfaces.push({index,texture:atlasSlot.texture,atlasSlot});
        body.userData.fieldworkWallSurface='w3-atlas';
        if(unified){
          const packet=compileUnifiedWallGeometry(body.geometry,trimPackets[index],angle,WALL_VISUAL_HEIGHT,atlasSlot);
          // Atlas body geometry is site-owned, not a shared cached box.
          body.geometry.dispose();body.geometry=packet.geometry;
          restrictWallShadowToBody(body,packet.shadowIndexCount,packet.bodySphere);
          body.userData.fieldworkUnifiedWall=true;
          body.userData.fieldworkShadowIndexCount=packet.shadowIndexCount;
          body.userData.fieldworkTrimSourceCount=trimPackets[index].parts.length;
        }
      }else if(host.wallAudition){
        // Map Lab allocates one bounded mask even on clean walls so the
        // condition slider can scrub without allocating or recompiling.
        const recipe=planWallSurface(site,index,WALL_VISUAL_HEIGHT);
        const {width,height}=wallPatinaDimensions(len);
        const patterned=!!individualWall.map;
        const texture=new THREE.DataTexture(
          packedWallSurfacePixels(recipe,effectiveCondition(site),width,host.wallAudition.effect,patterned),
          width,height,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.NearestMipmapNearestFilter;
        texture.generateMipmaps=true;texture.needsUpdate=true;
        host.sitePatinaTextures.push(texture);
        host.patinaWallSurfaces.push({index,texture,recipe,patterned});
        individualWall.map=texture;individualWall.color.setHex(0xffffff);individualWall.needsUpdate=true;
        body.userData.fieldworkWallSurface='w2-audition';
      }else if(effectiveCondition(site)>0){
        // Keep approximately one weathering texel per world unit along
        // long walls, rather than stretching the same 64 pixels over
        // entire retail facades. Height stays a bounded 64 pixels.
        const {width,height}=wallPatinaDimensions(len);
        const texture=new THREE.DataTexture(
          conditionWallPixels(site,index,effectiveCondition(site),width,height),
          width,height,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.NearestMipmapNearestFilter;
        texture.generateMipmaps=true;texture.needsUpdate=true;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        host.sitePatinaTextures.push(texture);host.sitePatinaMaterials.push(material);
        host.patinaWallSurfaces.push({index,texture});
        body.userData.patinaMaterial=material;
        // A single mesh carries front and rear patina. Unlike two separate
        // transparent planes this submits one WebGL draw for each wall.
        const wearMesh=new THREE.Mesh(doubleSidedWallWear(len,WALL_VISUAL_HEIGHT-.4),material);
        wearMesh.castShadow=false;wearMesh.receiveShadow=false;
        wearMesh.userData.fieldworkDrawFamily='wall-weathering';
        wearMesh.userData.fieldworkTransparencyRole='wall-weathering';
        body.add(wearMesh);
      }
      host.walls.push({mesh:body,mid:{x,y:z},segment:wall,index,exterior});
      // These child textures are already transparent, but would otherwise
      // draw BEFORE the fog and disappear from the restored façade.
      if(exterior)body.traverse(child=>{
        if(child!==body&&child instanceof THREE.Mesh)child.renderOrder=1002;
      });
      if(!host.wallAudition)for(const mark of marksOn('wall',index))
        host.addSurfaceWear(body,mark,(mark.u-.5)*len,(mark.v-.5)*(WALL_VISUAL_HEIGHT-8),
          mark.face==='back'?-4.6:4.6,wallPixelSurface(site.archetype));
      if(!compiledTrim){
      const individualFoot=skirting.clone();
       host.wallMaterials.add(individualFoot);
       const foot=host.box(group,x,2,z,len,4,12,individualFoot,false);
       foot.rotation.y=angle;
       foot.userData.fieldworkDrawFamily='structural-wall-skirting';
       host.walls.push({mesh:foot,mid:{x,y:z},segment:wall,index,exterior});
      const individualCap=capMat.clone();
      host.wallMaterials.add(individualCap);
      // End-trim joined wall crowns. A distinct, slightly raised joint
      // covers each seam without coplanar top faces fighting for depth.
      const [startTrim,endTrim]=capJoins.trims[index];
      const capLength=Math.max(1,len-startTrim-endTrim);
      const shift=(startTrim-endTrim)/2;
      const capX=x+(b.x-a.x)/len*shift;
      const capZ=z+(b.y-a.y)/len*shift;
      const cap=host.box(group,capX,WALL_VISUAL_HEIGHT+.3,capZ,
        capLength,2,11,individualCap,false);
      cap.rotation.y=angle;
      cap.userData.fieldworkDrawFamily='structural-wall-cap';
      host.walls.push({mesh:cap,mid:{x,y:z},segment:wall,index,exterior});
      }
    }
    if(compiledTrim){
      for(const packet of trimPackets){
        if(unified&&atlas?.slots.has(packet.index))continue;
        const geometry=compileWallTrimGeometry(packet);if(!geometry)continue;
        const material=capMat.clone();material.map=null;material.color.setHex(0xffffff);material.vertexColors=true;
        host.wallMaterials.add(material);
        const mesh=new THREE.Mesh(geometry,material);mesh.position.set(packet.mid.x,0,packet.mid.y);
        mesh.castShadow=false;mesh.receiveShadow=true;
        mesh.userData.fieldworkDrawFamily='structural-wall-trim-packet';
        mesh.userData.fieldworkTrimSourceCount=packet.parts.length;
        wallGroups[packet.index].add(mesh);
        const segment=site.walls[packet.index];
        host.walls.push({mesh,mid:packet.mid,segment,index:packet.index,exterior:accessibleExteriorWall(site,segment)});
      }
    }else for(const joint of capJoins.junctions){
      const parent=wallGroups[joint.owner];
      if(!parent)continue;
      const jointMaterial=capMat.clone();host.wallMaterials.add(jointMaterial);
      const connector=host.box(parent,joint.p.x,WALL_VISUAL_HEIGHT+.35,
        joint.p.y,11,2.12,11,jointMaterial,false);
      connector.castShadow=false;
      const segment=site.walls[joint.owner];
      connector.userData.fieldworkDrawFamily='structural-wall-cap-joint';
      host.walls.push({mesh:connector,mid:joint.p,segment,index:joint.owner,
        exterior:accessibleExteriorWall(site,segment)});
    }
    const openingHost:SiteOpeningsHost={
      root:host.root,
      visualTemplates:host.visualTemplates,
      registerVisualLease:host.registerVisualLease,
      box:(...args)=>host.box(...args),
      solid:(...args)=>host.solid(...args),
      age:(hex,surface)=>age(hex,surface),
      track:material=>host.siteMaterials.track(material),
      addSurfaceWear:(...args)=>host.addSurfaceWear(...args),
      marksOn,promoteFacadeDetails,
      registerArch:(opening,obj)=>host.architecturalOpenings.push({opening,obj}),
      registerDoor:(id,visual)=>host.doors.set(id,visual),
      recordDoorGlass:(id,value)=>host.observedDoorGlass.set(id,value),
      recordDoorOpen:(id,value)=>host.observedDoorOpen.set(id,value),
      registerGlass:(id,glass)=>host.windowGlass.set(id,glass),
      registerWallSurface:(obj,index)=>host.intelSurfaces.push({obj,kind:'wall',index})
    };
    buildArchitecturalOpenings(site,openingHost,host.solid(theme.trim));
    const doorTrim=host.solid(age(theme.trim,'painted-wood'),.9,'painted-wood');
    const metal=host.solid(0x586665,.78,'industrial-steel');
    buildSiteDoors(site,openingHost,{theme,doorTrim,metal});
    let vehicleMaterial:THREE.MeshStandardMaterial|undefined;
    const fixtureCtx:FixtureVisualContext={
      vehicleMaterial:()=>{
        if(!vehicleMaterial){vehicleMaterial=createVehicleMaterial();host.siteMaterials.track(vehicleMaterial);}
        return vehicleMaterial;
      },
      box:(parent,x,y,z,w,h,d,material,cast)=>
        host.box(parent,x,y,z,w,h,d,material,cast),
      solid:(hex,roughness,surface)=>host.solid(age(hex,surface),roughness,surface),
    };
    const fixtureWearCache=new Map<string,THREE.MeshStandardMaterial>();
    host.pendingFixtureWear=[];host.retiredFixtureWearGeometry=new Set();
    site.cover.forEach((c,i)=>{
      const group=new THREE.Group();host.root.add(group);
      host.coverGroups.set(i,group);
      host.intelSurfaces.push({obj:group,kind:'cover',index:i});
      // The aperture renderer already creates the sill/parapet. Its cover
      // footprint still blocks passage; do not place a second box on it.
      if(isArchitecturalSillCover(site,c))return;
      // Build models in local coordinates, so rotating a chair also rotates
      // its back, legs and surface wear around its actual center.
      group.position.set(c.x,0,c.y);
      group.rotation.y=(c.orientation??0)*Math.PI/2;
      const turned=(c.orientation??0)%2===1;
      const visual={...c,x:0,y:0,w:turned?c.h:c.w,h:turned?c.w:c.h};
      const intact=new THREE.Group(),debris=new THREE.Group();
      group.add(intact,debris);
      debris.visible=false;
      host.coverVisualStates.set(i,{intact,debris});
      // Five deterministic condition tones prevent furniture from looking
      // as though every object aged uniformly at precisely the same rate.
      const variant=((i%5)-2)/2;
      const fixtureRoom=site.rooms.find(room=>
        c.x>=room.x&&c.x<=room.x+room.w&&
        c.y>=room.y&&c.y<=room.y+room.h);
      const finish=roomFixtureFinishes(theme,fixtureRoom?.purpose,fixtureRoom?.tone);
      const localCtx:FixtureVisualContext={...fixtureCtx,
        solid:(hex,roughness,surface)=>host.solid(age(hex,surface,variant),roughness,surface)};
      const palette={
        wood:host.solid(age(finish.wood,'furniture-wood',variant),.9,'furniture-wood'),
        steel:host.solid(age(finish.metal,'metal',variant),.8,'metal'),
        olive:host.solid(age(finish.fabric,'fabric',variant),.9,'fabric'),
        metal:host.solid(age(0x586665,'industrial-steel',variant),.78,'industrial-steel')
      };
      const bushHeight=visual.fixture==='shrub-round'?23:
        visual.fixture==='shrub-tall'?37:visual.fixture==='bush'?25:0;
      const previewBush=!!host.previewBush&&!fixtureRoom&&bushHeight>0;
      const isVehicle=!!vehicleFamily(visual.fixture??'');
      const templateLease=!previewBush&&host.registerVisualLease?
        (isVehicle&&host.vehicleTemplates?acquireVehicleTemplate(host.vehicleTemplates,visual,i,fixtureCtx.vehicleMaterial!):
          host.fixtureTemplates?acquireRigidFixtureTemplate(host.fixtureTemplates,visual,i,localCtx,palette,
            host.includeServiceFixtureTemplates===true):null):null;
      if(previewBush){
        host.previewBush!(intact,visual.w,bushHeight,visual.h);
      }else if(templateLease){
        // Direct children preserve the existing per-cover instancing and
        // disclosure ownership. The lease only manages shared GPU buffers.
        host.registerVisualLease?.(
          adoptRigidFixtureVisual(intact,templateLease));
      }else renderFixtureVisual(intact,visual,i,localCtx,
        palette.wood,palette.steel,palette.olive,palette.metal);
      if(!isVehicle&&!host.floorWearCompiled)for(const mark of marksOn('fixture',i)){
        const height=visibleSurfaceHeight(c.fixture??'crate');
        if(height<8)continue;
        host.addSurfaceWear(intact,mark,(mark.u-.5)*visual.w,
          Math.min(height-2,Math.max(3,mark.v*height)),visual.h/2+.8,
          fixturePixelSurface(c.fixture));
      }
      // Destruction never scales a complete shelving/cabinet silhouette into
      // a miniature. A collapsed fixture becomes low, irregular remnants
      // centered on the ACTUAL reduced physical footprint instead.
      const residue=host.solid(age(theme.wood,'furniture-wood',variant),
        .93,'furniture-wood');
      const slag=host.solid(age(0x4c5955,'industrial-steel',variant),
        .85,'industrial-steel');
      // Batch only opaque, rigid, site-lifetime fixture pieces.
      if(!templateLease)consolidateStaticFixtureParts(intact);
      if(!isVehicle&&host.floorWearCompiled&&!previewBush&&host.fixtureWearStrength)for(const mark of marksOn('fixture',i)){
        const height=visibleSurfaceHeight(c.fixture??'crate');if(height<8)continue;
        const originalChildren=[...intact.children];
        host.pendingFixtureWear!.push(()=>{
          if(originalChildren.some(child=>child.parent!==intact))return;
          projectFixtureWear(intact,mark,(mark.u-.5)*visual.w,
          Math.min(height-2,Math.max(3,mark.v*height)),visual.h/2+.8,fixturePixelSurface(c.fixture),{
            textures:host.wearTextures,cache:fixtureWearCache,boost:host.fixtureWearStrength!,
            track:m=>host.siteMaterials.track(m),shared:host.sharedBoxGeometries,template:!!templateLease,
            retireGeometry:g=>host.retiredFixtureWearGeometry!.add(g)
          });
        });
      }
      for(let j=0;j<(isVehicle?0:3);j++){
        const sx=(j%3-1)*visual.w*.105,sz=(Math.floor(j/3)-.5)*visual.h*.15;
        const width=Math.max(3.2,visual.w*(j%2?.16:.20));
        const depth=Math.max(3.2,visual.h*(j%2?.18:.20));
        const height=2.3+(j%3)*1.3;
        const fragment=host.box(debris,sx,height/2+.35,sz,
          width,height,depth,j%2?slag:residue,false);
        fragment.rotation.y=(j%2?-.22:.27);
        fragment.castShadow=false;
      }
      consolidateStaticFixtureParts(debris);
      host.repeatedFixtures?.collect(i,group,intact);
      host.repeatedFixtures?.collect(i,group,debris);
    });
    // Glass does not impede sight; the low sill does impede traversal.
    if(!host.windowPaneMaterial){
      host.windowPaneMaterial=new THREE.MeshStandardMaterial({
        color:0xa7bdb9,roughness:.25,transparent:true,opacity:.35,
        side:THREE.DoubleSide,depthWrite:false});
      host.mats.push(host.windowPaneMaterial);
    }
    const paneMat=host.windowPaneMaterial;
    buildSiteWindows(site,openingHost,{paneMat,wallMat,capMat,doorTrim,metal});
    // Wall-mounted art and electrical hardware inherit room visibility.
    // They do not add collision, cover or new sightline blockers.
    const wallPaper=host.solid(0xb8ad8e,.97,'paper'),wallFrame=host.solid(0x615246,.9,'wood');
    const wallMetal=host.solid(0x697b79,.81,'metal'),wallDark=host.solid(0x343e3c,.82,'metal');
    const wallRed=host.solid(0xa66f57,.92,'paper');
    for(const detail of site.wallDetails??[]){
      if(!decorativeRoomGroups.has(detail.roomId))continue;
      const prop=new THREE.Group();
      prop.position.set(detail.x,detail.height,detail.y);
      prop.rotation.y=detail.angle;
      const w=detail.width,h=detail.depth;
      switch(detail.kind){
      case 'poster': case 'picture': case 'noticeboard':
        host.box(prop,0,0,0,w,h,.9,
          detail.kind==='noticeboard'?wallFrame:wallPaper,false);
        host.box(prop,0,0,.65,w-2,h-2,.5,
          detail.kind==='poster'?wallRed:
          detail.kind==='noticeboard'?wallPaper:wallMetal,false);
        host.box(prop,-w*.12,h*.14,.99,w*.45,1,.15,wallPaper,false);
        // A single shared texture communicates print/layout without extra geometry.
        const printed=new THREE.Mesh(new THREE.PlaneGeometry(w-3,h-3),
          host.signMaterial(detail.kind,site.seed));
        printed.position.z=1.18;prop.add(printed);
        break;
      case 'menu-board':case 'promotion-sign':case 'business-sign':
      case 'wayfinding-sign':case 'safety-sign':{
        const pixelKind=detail.kind==='menu-board'?'menu':
          detail.kind==='promotion-sign'?'sale':
          detail.kind==='business-sign'?'business':
          detail.kind==='safety-sign'?'safety':'wayfinding';
        const base=detail.kind==='safety-sign'?wallRed:
          detail.kind==='menu-board'?wallDark:wallMetal;
        host.box(prop,0,0,0,w,h,1.6,base,false);
        host.box(prop,0,0,1,w-2,h-2,.4,wallPaper,false);
        const front=new THREE.Mesh(new THREE.PlaneGeometry(w-3,h-3),
          host.signMaterial(pixelKind,site.seed+detail.roomId.length));
        front.position.z=1.25;prop.add(front);
        break;
      }
      case 'exit-sign':
        host.box(prop,0,0,0,w,h,1.3,wallRed,false);
        host.box(prop,0,0,.8,w*.67,2,.3,wallPaper,false);
        const exitGraphic=new THREE.Mesh(new THREE.PlaneGeometry(w-2,h-2),
          host.signMaterial('exit'));
        exitGraphic.position.z=1.05;prop.add(exitGraphic);
        break;
      case 'light-switch':
        host.box(prop,0,0,0,w,h,1.3,wallPaper,false);
        host.box(prop,0,0,1,1.4,3,.8,wallDark,false);
        break;
      case 'breaker-panel': case 'electrical-box':
        host.box(prop,0,0,0,w,h,3,wallMetal,false);
        host.box(prop,w*.25,0,1.8,1.5,h*.6,1,wallDark,false);
        if(detail.kind==='breaker-panel')
          for(const y of [-5,0,5])
            host.box(prop,-w*.16,y,2.2,w*.35,1.5,.7,wallDark,false);
        break;
      }
      host.root.add(prop);
      host.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y},
        microKey:'micro:'+Math.floor(detail.x/10)+','+Math.floor(detail.y/10),
        fineKey:'fine:'+Math.floor(detail.x/20)+','+Math.floor(detail.y/20)});
    }
    // K1/archived authored maps without wall decoration get explicitly
    // visible training hardware. Generated site controls reuse their
    // existing real wall-detail meshes above, never duplicate those props.
    const fallbackPositions=new Set<string>();
    for(const control of sitePowerControls(site)){
      if(control.sourceDetailId)continue;
      const key=control.p.x+','+control.p.y;
      if(fallbackPositions.has(key))continue;
      fallbackPositions.add(key);
      const prop=new THREE.Group();
      prop.position.set(control.p.x,18,control.p.y);
      const panel=control.kind==='breaker';
      host.box(prop,0,0,0,panel?13:5,panel?19:11,2.3,
        panel?wallMetal:wallPaper,false);
      host.box(prop,0,0,1.55,panel?5:1.4,panel?9:4,.9,
        wallDark,false);
      host.root.add(prop);
      host.observedDetails.push({obj:prop,position:{...control.p},
        microKey:'micro:'+Math.floor(control.p.x/10)+','+
          Math.floor(control.p.y/10),
        fineKey:'fine:'+Math.floor(control.p.x/20)+','+
          Math.floor(control.p.y/20)});
    }
    // Story props are discovered individually. Entering a room never
    // reveals its contents outside an operator's observed cone.
    const smallWood=host.solid(0x9a8669,.91,'wood'),smallPaper=host.solid(0xb8b4a0,.97,'paper');
    const smallGreen=host.solid(0x5f7b51,.94,'foliage'),smallClay=host.solid(0x947b60,.92,'concrete');
    for(const detail of site.dressing??[]){
      if(!decorativeRoomGroups.has(detail.roomId))continue;
      const prop=new THREE.Group();
      prop.position.set(detail.x,detail.elevation,detail.y);
      prop.rotation.y=detail.angle;
      switch(detail.kind){
      case 'mug':
        host.box(prop,0,2,0,5,4,5,smallClay,false);break;
      case 'books':
        for(let i=0;i<3;i++)host.box(prop,i*4-4,1.5,0,3,3,10,smallWood,false);
        break;
      case 'papers':
        host.box(prop,0,.35,0,12,.7,9,smallPaper,false);break;
      case 'tools':
        host.box(prop,0,1.5,0,13,2,3,smallWood,false);
        host.box(prop,3,1.5,3,3,3,7,smallPaper,false);break;
      case 'packages':{
        host.box(prop,0,5,0,11,10,9,smallWood,false);
        const label=new THREE.Mesh(new THREE.PlaneGeometry(7,5),
          host.signMaterial('package',site.seed));
        label.position.set(0,6,4.61);prop.add(label);break;
      }
      case 'plant':
        host.box(prop,0,4,0,8,8,8,smallClay,false);
        host.box(prop,0,12,0,11,9,11,smallGreen,false);break;
      case 'lamp':
        host.box(prop,0,8,0,2,16,2,smallWood,false);
        host.box(prop,0,17,0,12,7,12,smallPaper,false);break;
      case 'floor-lamp':
        host.box(prop,0,.8,0,10,1.6,10,smallWood,false);
        host.box(prop,0,15,0,2,29,2,smallWood,false);
        host.box(prop,0,31,0,13,9,13,smallPaper,false);break;
      case 'rug': case 'bedside-rug': case 'bath-mat':
      case 'welcome-mat': case 'runner':{
        const baseRugColor=detail.kind==='bath-mat'?0x728b83:
          detail.kind==='runner'?0x8a7c63:
          detail.kind==='welcome-mat'?0x635646:
          detail.kind==='bedside-rug'?0x8a7865:0x93765e;
        const purpose=site.rooms.find(room=>room.id===detail.roomId)?.purpose;
        const rugColor=roomAccessoryColor(theme,purpose,baseRugColor);
        const textile=host.solid(rugColor,.95,'fabric');
        const border=host.solid(0xc1b295,.95,'fabric');
        const w=detail.width??42,d=detail.depth??24;
        host.box(prop,0,.11,0,w,.22,d,textile,false);
        if(w>16&&d>12)host.box(prop,0,.23,0,w-4,.08,d-4,border,false);
        if(w>21&&d>15)host.box(prop,0,.28,0,w-8,.08,d-8,textile,false);
        break;
      }
      }
      host.root.add(prop);
      host.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y},
        microKey:'micro:'+Math.floor(detail.x/10)+','+Math.floor(detail.y/10),
        fineKey:'fine:'+Math.floor(detail.x/20)+','+Math.floor(detail.y/20)});
    }
    // Important: avoid visual-only furniture outside authoritative cover.
}

/** Preserve the authored legacy static fallback in the exact same build port. */
export function buildSiteWorld(site:Site|null,host:SiteSceneBuildPort):void {
    const earth=host.solid(0x34443e),road=host.solid(0x5d6358);
    const gravel=host.solid(0x6c7061),floorA=host.solid(0x817d6b);
    const floorB=host.solid(0x526b68),timber=host.solid(0x4b4437);
    const metal=host.solid(0x525e5d,.62),rust=host.solid(0x715e4d);
    const roof=host.solid(0x515d58),glass=host.solid(0x748b83,.18);
    if(site){buildGeneratedSite(site,host);return;}
    host.plane(host.root,W/2,H/2,W,H,-2,earth);
    host.box(host.root,303,-1,630,124,1,215,road,false);
    host.box(host.root,294,-.15,643,7,.2,178,gravel,false);
    host.box(host.root,355,-.15,643,8,.2,178,gravel,false);
    // Two genuinely distinct interior floor constructions.
    host.box(host.root,247,-.65,316,270,1.5,432,floorA,false);
    host.box(host.root,485,-.65,316,207,1.5,432,floorB,false);
    const tile=host.solid(0x9a9683);
    const grout:Pt[]=[];
    for(let x=122;x<580;x+=28)for(let z=114;z<523;z+=28)
      grout.push({x,y:z});
    const strips=new THREE.InstancedMesh(
      new THREE.BoxGeometry(27,.10,1),tile,grout.length);
    const transform=new THREE.Object3D();
    grout.forEach((p,i)=>{
      transform.position.set(p.x,-.05,p.y);transform.updateMatrix();
      strips.setMatrixAt(i,transform.matrix);
    });
    strips.instanceMatrix.needsUpdate=true;strips.receiveShadow=true;
    host.root.add(strips);
    const crossGrout=new THREE.InstancedMesh(
      new THREE.BoxGeometry(1,.10,27),tile,grout.length);
    grout.forEach((p,i)=>{
      transform.position.set(p.x,-.04,p.y);transform.updateMatrix();
      crossGrout.setMatrixAt(i,transform.matrix);
    });
    crossGrout.instanceMatrix.needsUpdate=true;
    crossGrout.receiveShadow=true;host.root.add(crossGrout);
    // Each wall is one real mesh. Simulation geometry remains authoritative.
    for(let i=0;i<WALLS.length;i++){
      const segment=WALLS[i];
      const p1=segment.a,p2=segment.b;
      const dx=p2.x-p1.x,dz=p2.y-p1.y;
      const len=Math.hypot(dx,dz);
      const bodyMaterial=host.solid(i===4?0x81877d:0xb4a991).clone();host.wallMaterials.add(bodyMaterial);
      const mesh=host.box(host.root,(p1.x+p2.x)/2,WALL_VISUAL_HEIGHT/2,
        (p1.y+p2.y)/2,len+3,WALL_VISUAL_HEIGHT,9,bodyMaterial);
      mesh.rotation.y=-Math.atan2(dz,dx);
      host.walls.push({mesh,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2},segment,index:i,exterior:i<5});
      // Dark skirting separates the wall footprint from similar floor values.
      const footMaterial=host.solid(0x36453f).clone();host.wallMaterials.add(footMaterial);
      const skirting=host.box(host.root,mesh.position.x,2,mesh.position.z,
        len+4,4,12,footMaterial,false);
      skirting.rotation.y=mesh.rotation.y;
       host.walls.push({mesh:skirting,mid:{x:mesh.position.x,y:mesh.position.z},segment,index:i,exterior:i<5});
      // A dark, legible wall cap communicates height in either camera mode.
      const capMaterial=host.solid(0x51483a).clone();host.wallMaterials.add(capMaterial);
      const cap=host.box(host.root,mesh.position.x,WALL_VISUAL_HEIGHT+.3,
        mesh.position.z,
        len+4,2,11,capMaterial,false);cap.rotation.y=mesh.rotation.y;
      host.walls.push({mesh:cap,mid:{x:mesh.position.x,y:mesh.position.z},segment,index:i,exterior:i<5});
    }
    for(const x of [209,502]){
      const pane=host.box(host.root,x+25,16,99,51,21,2,glass,false);
      host.box(host.root,x+25,28,97,56,2,5,timber,false);
      host.box(host.root,x+25,4,97,56,2,5,timber,false);
      pane.castShadow=false;
    }
    // 080: Doorways are real stateful meshes, not slabs that disappear.
    const doorMat=host.solid(0xab8655),doorTrim=host.solid(0xe0c28c);
    const thresholdMat=host.solid(0xc19b5c);
    for(const [doorIndex,sourceDoor] of initialDoors().entries()){
      const door=initDoor(sourceDoor,doorIndex);
      const width=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door);
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      group.rotation.y=-Math.atan2(door.b.y-door.a.y,door.b.x-door.a.x);
      const frame=new THREE.Group();group.add(frame);
      const profile=doorProportions(door);
      const jambX=width/2+profile.jambWidth/2-DOOR_FRAME_INSET;
      for(const side of [-1,1]){
        host.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
          profile.jambWidth,DOOR_CLEAR_VISUAL_HEIGHT,profile.jambDepth,doorTrim);
        host.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,
          profile.jambDepth/2+1.25,profile.casingWidth,
          DOOR_CLEAR_VISUAL_HEIGHT-3,
          profile.casingDepth,doorTrim,false);
      }
      host.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight/2,0,
        width+2*profile.jambWidth,
        profile.headerHeight,profile.headerDepth,doorTrim);
      host.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight+.5,1.50,
        width+2*profile.jambWidth+1,
        1.1,profile.headerDepth+.8,doorTrim,false);
      const threshold=host.box(frame,0,.275,0,width,
        profile.thresholdHeight,profile.thresholdDepth,thresholdMat,false);
      const hinge=new THREE.Group();hinge.position.x=door.hinge==='b'?width/2:-width/2;
      group.add(hinge);
      host.box(hinge,(door.hinge==='b'?-1:1)*width/2,
        DOOR_LEAF_VISUAL_HEIGHT/2,0,
        width-2*DOOR_PANEL_END_RECESS,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,doorMat);
      const hardware=buildDoorHardwareVisual(group,hinge,width,
        door.hinge,profile.leafThickness,doorTrim,host.box);
      const halo=doorSweepArc(door,width,
        material=>host.siteMaterials.track(material));
      group.add(halo);
      host.root.add(group);
      const wedge=host.box(frame,0,1.9,6,6,2.7,6,thresholdMat,false);
      wedge.visible=false;
      host.doors.set(door.id,{root:group,leaf:hinge,frame,halo,
        threshold,wedge,...hardware});
      host.observedDoorOpen.set(door.id,0);
    }
    // Furniture height matches cover classification: low crates vs high cabinets.
    for(let i=0;i<COVER.length;i++){
      const c=COVER[i],height=c.low?11:27;
      host.box(host.root,c.x,height/2,c.y,c.w,height,c.h,
        i%3===0?metal:i%3===1?timber:rust);
      if(c.low){
        host.box(host.root,c.x,height+1,c.y,c.w-5,2,c.h-5,roof,false);
        for(let j=0;j<3;j++)
          host.box(host.root,c.x-c.w/3+j*c.w/3,height+2,c.y,
            2,3,c.h-4,timber,false);
      }else{
        for(let j=0;j<3;j++)
          host.box(host.root,c.x-c.w/3+j*c.w/3,height*.55,c.y+c.h/2+.8,
            1,8,2,metal,false);
      }
    }
    // Authored practical scenery beyond the collision boxes.
    const objects=[
      [190,143,32,17,12],[232,458,44,13,19],[440,306,21,25,20],
      [510,340,48,12,16],[175,570,62,14,26],[489,653,46,16,33],
    ];
    for(const [x,z,w,h,d] of objects){
      host.box(host.root,x,h/2,z,w,h,d,timber);
      host.box(host.root,x,h+.5,z,w+2,1,d+2,metal,false);
    }
    // Yard fence with actual posts, worn cross rails, perimeter clutter.
    for(const x of [62,608])for(let z=90;z<=560;z+=45){
      host.box(host.root,x,11,z,4,22,4,timber);
      if(z<545)host.box(host.root,x,13,z+22,2,2,44,rust,false);
    }
    const barrel=host.solid(0x6b7369),barrelTop=host.solid(0x343c39);
    for(const [x,z] of [[170,653],[473,654],[545,701],[102,656],
      [116,557],[548,574]]){
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(10,10,20,9),barrel);
      cyl.position.set(x,10,z);cyl.castShadow=true;host.root.add(cyl);
      const top=new THREE.Mesh(new THREE.CylinderGeometry(10.1,10.1,2,9),barrelTop);
      top.position.set(x,21,z);host.root.add(top);
    }
    // Decorative exterior shrubs are temporarily retired in V15.
    // Exterior hardware makes the station identifiable as a real place.
    const pole=host.solid(0x655e4d);
    for(const [x,z] of [[84,150],[603,510]]){
      host.box(host.root,x,52,z,5,104,5,pole);
      host.box(host.root,x,98,z,37,3,3,timber);
    }
    // A translucent roof lip gives silhouette without covering any rooms.
    const lip=host.box(host.root,352,36,100,474,5,18,roof,false);
    lip.castShadow=false;
    host.box(host.root,348,35,535,460,3,13,roof,false);
}
