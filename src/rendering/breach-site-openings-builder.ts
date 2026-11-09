/** Presentation-only site openings. Simulation owns colliders and LOS. */
import * as THREE from 'three';
import {buildingTheme} from '../worldgen/building-palettes.ts';
import {accessibleExteriorWall} from '../breach-site-footprint.ts';
import {doorCenter,type Door} from '../breach-core.ts';
import {initDoor} from '../breach-door.ts';
import {doorProportions,DOOR_PANEL_END_RECESS,DOOR_FRAME_INSET,
 WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT,DOOR_LEAF_VISUAL_HEIGHT}
 from '../breach-door-proportions.ts';
import {windowVisualHeadHeight,SERVING_COUNTER_VISUAL_HEIGHT}
 from '../breach-opening-proportions.ts';
import type {Site,WideOpening} from '../breach-site.ts';
import type {ObjectWear} from '../worldgen/object-wear.ts';
import type {PixelSurface} from './pixel-materials.ts';

export type SiteOpeningsHost={
 root:THREE.Object3D;
 box:(parent:THREE.Object3D,x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material,cast?:boolean)=>THREE.Mesh;
 solid:(hex:number,roughness?:number,surface?:PixelSurface)=>THREE.Material;
 age:(hex:number,surface:PixelSurface|undefined)=>number;
 track:(material:THREE.Material)=>THREE.Material;
 addSurfaceWear:(parent:THREE.Object3D,mark:ObjectWear,x:number,y:number,z:number,
  surface:PixelSurface)=>void;
 marksOn:(owner:ObjectWear['owner'],index:number)=>ObjectWear[];
 promoteFacadeDetails:(group:THREE.Object3D)=>void;
 registerArch:(opening:WideOpening,obj:THREE.Group)=>void;
 registerDoor:(id:string,visual:{root:THREE.Group;leaf:THREE.Group;
  frame:THREE.Group;halo:THREE.Group;threshold:THREE.Mesh;wedge:THREE.Mesh;
  glassPane?:THREE.Mesh})=>void;
 recordDoorGlass:(id:string,value:boolean)=>void;
 recordDoorOpen:(id:string,value:number)=>void;
 registerGlass:(id:string,glass:THREE.Mesh)=>void;
 registerWallSurface:(obj:THREE.Group,index:number)=>void;
};
/** Blueprint-style ground sweep, fixed to the actual hinge and opening side. */
export function doorSweepArc(door:Door,length:number):THREE.Group{
  const group=new THREE.Group(),points:THREE.Vector3[]=[];
  const hinge=door.hinge==='b'?length/2:-length/2;
  const sign=door.hinge==='b'?-1:1;
  const reach=Math.max(0,length-DOOR_PANEL_END_RECESS);
  for(let i=0;i<=24;i++){
    const angle=(door.swing??-1)*1.54*i/24;
    points.push(new THREE.Vector3(
      hinge+sign*reach*Math.cos(angle),1.7,
      -sign*reach*Math.sin(angle)));
  }
  const material=new THREE.LineDashedMaterial({
    color:0xf5d68e,transparent:true,opacity:.9,
    dashSize:5,gapSize:4,depthTest:true,depthWrite:false});
  const stroke=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);
  stroke.computeLineDistances();group.add(stroke);
  const hingeDot=new THREE.Mesh(
    new THREE.CircleGeometry(3,12),
    new THREE.MeshBasicMaterial({color:0xffdb8b,side:THREE.DoubleSide,depthWrite:false}));
  hingeDot.rotation.x=-Math.PI/2;
  hingeDot.position.set(hinge,1.75,0);group.add(hingeDot);
  group.visible=false;
  return group;
}

export function buildArchitecturalOpenings(site:Site,host:SiteOpeningsHost,
 trimMaterial:THREE.Material):void{
    const archMaterial=trimMaterial;
    for(const opening of site.openings??[]){
      const width=Math.hypot(opening.a.x-opening.b.x,opening.a.y-opening.b.y);
      const p={x:(opening.a.x+opening.b.x)/2,y:(opening.a.y+opening.b.y)/2};
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      group.rotation.y=Math.abs(opening.a.x-opening.b.x)<1?-Math.PI/2:0;
      for(const side of [-1,1])host.box(group,side*width/2,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
        4,DOOR_CLEAR_VISUAL_HEIGHT,10,archMaterial);
      host.box(group,0,DOOR_CLEAR_VISUAL_HEIGHT+2,0,
        width+4,4,11,archMaterial);
      if(opening.kind==='serving'){
        // Counter surface sits just below the standing operator's eye line
        // rather than at the old knee-high sill. Upper trim rests on the
        // slab without coincident faces or a duplicate cover render mesh.
        const height=SERVING_COUNTER_VISUAL_HEIGHT;
        host.box(group,0,height/2,0,width,height,10,archMaterial);
        host.box(group,0,height+1.15,6.2,width+3,2,10,
          archMaterial,false);
      }
      host.root.add(group);
      host.registerArch(opening,group);
    }
}
export function buildSiteDoors(site:Site,host:SiteOpeningsHost,
 materials:{theme:ReturnType<typeof buildingTheme>;
 doorTrim:THREE.Material;metal:THREE.Material}):void{
    const {theme,doorTrim,metal}=materials;
    const doorMat=host.solid(host.age(theme.door,'door-wood'),.88,'door-wood');
    const doorGlass=host.track(new THREE.MeshStandardMaterial({
      color:0xa8c2bf,roughness:.24,transparent:true,opacity:.29,
      depthWrite:false,side:THREE.DoubleSide}));
    for(const [doorIndex,sourceDoor] of site.doors.entries()){
      const door=initDoor(sourceDoor,doorIndex);
      const length=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door);
      const root=new THREE.Group();root.position.set(p.x,0,p.y);
      root.rotation.y=-Math.atan2(door.b.y-door.a.y,door.b.x-door.a.x);
      const frame=new THREE.Group();root.add(frame);
      const profile=doorProportions(door);
      // Preserve the full structural opening: jambs are mounted outside
      // the walkable interval, instead of projecting into the threshold.
      const jambX=length/2+profile.jambWidth/2-DOOR_FRAME_INSET;
      const jambSides=door.pairedWith?
        [door.hinge==='b'?1:-1]:[-1,1];
      for(const side of jambSides){
        host.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
          profile.jambWidth,DOOR_CLEAR_VISUAL_HEIGHT,profile.jambDepth,doorTrim);
        // Small face rebate keeps the chunky iconography without two
        // massive offset bars dominating the aperture.
        host.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,
          profile.jambDepth/2+1.25,profile.casingWidth,
          DOOR_CLEAR_VISUAL_HEIGHT-3,
          profile.casingDepth,doorTrim,false);
      }
      host.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight/2,0,
        length+2*profile.jambWidth,
        profile.headerHeight,profile.headerDepth,doorTrim);
      host.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight+.5,1.50,
        length+2*profile.jambWidth+1,
        1.1,profile.headerDepth+.8,doorTrim,false);
      const threshold=host.box(frame,0,.275,0,length,
        profile.thresholdHeight,profile.thresholdDepth,doorTrim,false);
      const leaf=new THREE.Group();
      let glassPane:THREE.Mesh|undefined;
      const invert=door.hinge==='b';
      leaf.position.x=door.kind==='shutter'||door.kind==='sliding'?0:invert?length/2:-length/2;
      // Actual hinge barrels identify the swing side without requiring
      // a user to inspect a top-down arrow on every doorway.
      if(door.kind!=='shutter'&&door.kind!=='sliding')for(const y of [9,24,42])
        host.box(frame,invert?length/2:-length/2,y,0,
          profile.hingeDiameter,5.2,profile.hingeDepth,metal,false);
      root.add(leaf);
      if(door.kind==='shutter'){
        for(let y=2;y<DOOR_LEAF_VISUAL_HEIGHT;y+=5)
          host.box(leaf,0,y,0,length-3,4.7,4,metal,false);
        host.box(frame,0,WALL_VISUAL_HEIGHT,0,length+10,9,13,metal,false);
        for(const side of [-1,1])
          host.box(frame,side*length*.49,WALL_VISUAL_HEIGHT/2,2.1,
          2,WALL_VISUAL_HEIGHT-2,4,metal,false); // shutter runners
        host.box(leaf,0,4,2.5,length*.37,2,1.4,doorTrim,false); // lower pull
      }else{
        if(door.kind==='sliding'){
          host.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+2,1.6,
            length*2.1,3,6,metal,false);
          host.box(frame,0,1,1.6,length*2.1,1.3,4,metal,false);
        }
        const style=door.style??'wood';
        const panel=style==='wood'?doorMat:style==='exit'?
          host.solid(0x996c53,.78,'painted-metal'):style==='reinforced'?
          host.solid(0x53615e,.78,'industrial-steel'):host.solid(0x72817d,.78,'painted-metal');
        const middle=door.kind==='sliding'?0:(invert?-1:1)*length/2;
        if(style==='mesh-gate'){
          const frameMaterial=host.solid(0x586665,.8,'industrial-steel');
          for(const sign of [-1,1])host.box(leaf,middle+sign*(length/2-2),
            DOOR_LEAF_VISUAL_HEIGHT/2,0,3,DOOR_LEAF_VISUAL_HEIGHT,3,
            frameMaterial,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])host.box(leaf,middle,y,0,length-4,3,3,frameMaterial,false);
          for(let x=-length/2+7;x<length/2-3;x+=9)
            host.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              1,DOOR_LEAF_VISUAL_HEIGHT-6,1,frameMaterial,false);
          for(const y of [11,25,39])host.box(leaf,middle,y,0,length-6,1,1,frameMaterial,false);
        }else if(style==='french'||style==='screen'){
          for(const sign of [-1,1])
            host.box(leaf,middle+sign*(length/2-3),
              DOOR_LEAF_VISUAL_HEIGHT/2,0,
              3.2,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,metal,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])host.box(leaf,middle,y,0,length-4,
              3.4,profile.leafThickness,metal,false);
          if(style==='french'){
            const pane=host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              length-8,DOOR_LEAF_VISUAL_HEIGHT-8,1,doorGlass,false);
            pane.castShadow=false;glassPane=pane;
            for(const y of [15,32])host.box(leaf,middle,y,0,length-5,2,3,metal,false);
            host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,2,
              DOOR_LEAF_VISUAL_HEIGHT-7,3,metal,false);
          }else{
            for(let x=-length/2+5;x<length/2-2;x+=7)
              host.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,0,.9,
                DOOR_LEAF_VISUAL_HEIGHT-8,1,metal,false);
          }
        }else if(style==='glazed'){
          const pane=host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              length-8,DOOR_LEAF_VISUAL_HEIGHT-8,1,doorGlass,false);
          pane.castShadow=false;glassPane=pane;
          for(const sign of [-1,1])
            host.box(leaf,middle+sign*(length/2-3),
              DOOR_LEAF_VISUAL_HEIGHT/2,0,
              3.2,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,metal,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])host.box(leaf,middle,y,0,length-4,
              3.8,profile.leafThickness,metal,false);
          host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
            length-5,2.3,3,metal,false);
        }else host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
          length-4,DOOR_LEAF_VISUAL_HEIGHT,
          profile.leafThickness,panel);
        if(style==='wood'){
          // Quiet manufactured two-panel door joinery; no floorboard motif.
          const inset=host.solid(theme.door,.9,'painted-wood');
          for(const y of [12,26,40]){
            host.box(leaf,middle,y,
              profile.leafThickness/2+.16,length*.64,10,.7,inset,false);
            for(const sx of [-1,1])
              host.box(leaf,middle+sx*length*.32,y,
                profile.leafThickness/2+.24,1,10,.7,doorTrim,false);
          }
        }
        for(const sign of [-1,1]){
          // Hardware sits against the panel face, not at the old slab depth.
          const z=sign*(profile.leafThickness/2+1.05);
          const handleX=(invert?-1:1)*length*.70;
          host.box(leaf,handleX,18,z,3,5,1.9,metal,false);
          host.box(leaf,handleX+(invert?2:-2),18,z*1.12,4,1.4,1.6,metal,false);
          host.box(leaf,handleX,13,z,1,1.3,1.7,metal,false);
        }
        if(style==='steel'||style==='reinforced'){
          for(const y of style==='reinforced'?[6,17,28]:[8,28])
            host.box(leaf,middle,y,2.5,length*.78,2.2,1.2,metal,false);
        }
        if(style==='louvered'){
          for(let y=7;y<DOOR_LEAF_VISUAL_HEIGHT-4;y+=4)host.box(leaf,middle,y,3,length*.77,1.2,1.4,metal,false);
        }
        if(style==='barn'){
          for(const x of [-length*.31,length*.31])
            host.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,3,2.5,
              DOOR_LEAF_VISUAL_HEIGHT-8,3,metal,false);
          host.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,3,
            length*.84,3,2,metal,false);
        }
        if(style==='fire')host.box(leaf,middle,17,4,length*.66,2.5,3.5,metal,false);
        if(style==='reinforced')
          for(const x of [-length*.30,length*.30])
            host.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,2.5,2,
              DOOR_LEAF_VISUAL_HEIGHT-7,1.4,metal,false);
        if(style==='exit'){
          const bar=host.solid(0xc5ad88);
          host.box(leaf,middle,18,3.6,length*.75,2.2,3.2,bar,false);
          for(const x of [-length*.29,length*.29])
            host.box(leaf,middle+x,16.5,4,2,4,3.1,metal,false);
        }
      }
      for(const mark of host.marksOn('door',doorIndex)){
        const middle=(door.hinge==='b'?-1:1)*length/2;
        host.addSurfaceWear(leaf,mark,middle+(mark.u-.5)*(length-8),
          7+mark.v*(DOOR_LEAF_VISUAL_HEIGHT-14),profile.leafThickness/2+.27,
          door.style==='wood'?'door-wood':'painted-metal');
      }
      const halo=door.kind==='sliding'?new THREE.Group():doorSweepArc(door,length);
      root.add(halo);
      host.root.add(root);
      const wedge=host.box(frame,0,1.9,6,6,2.7,6,metal,false);
      wedge.visible=false;
      if(accessibleExteriorWall(site,door)){
        // Public doors are façade elements, including jambs, closed leaf
        // and hardware. Their stored/observed state is STILL authoritative.
        // Do not promote the planning halo or undiscovered interior props.
        host.promoteFacadeDetails(frame);
        host.promoteFacadeDetails(leaf);
      }
      host.registerDoor(door.id,{root,leaf,frame,halo,threshold,wedge,glassPane});
      host.recordDoorGlass(door.id,!!door.glassShattered);
      host.recordDoorOpen(door.id,door.openFraction??0);
    }
}
export function buildSiteWindows(site:Site,host:SiteOpeningsHost,
 materials:{paneMat:THREE.Material;wallMat:THREE.Material;
 doorTrim:THREE.Material;metal:THREE.Material}):void{
 const {paneMat,wallMat,doorTrim,metal}=materials;
    for(const opening of site.windows??[]){
      const group=new THREE.Group();
      group.position.set(opening.x,0,opening.y);
      group.rotation.y=opening.vertical?-Math.PI/2:0;
      const style=opening.style??'standard';
      // Window families retain the SAME underlying structural aperture,
      // low sill and true planar glass for shots/visibility.
      const baseTop=opening.sillHeight??14;
      const glassTop=opening.headHeight??windowVisualHeadHeight(style);
      const glassHeight=Math.max(1,glassTop-baseTop);
      const trim=opening.interior?host.solid(0x4f605f,.66,'painted-metal'):
        ['industrial','wire','clerestory','storefront'].includes(style)?metal:
        style==='picture'?host.solid(0x627c79):doorTrim;
      if(baseTop>0)host.box(group,0,baseTop/2,0,opening.width,baseTop,9,wallMat);
      const actualTop=glassTop;
      if(actualTop<WALL_VISUAL_HEIGHT)host.box(group,0,
        (actualTop+WALL_VISUAL_HEIGHT)/2,0,opening.width,
        WALL_VISUAL_HEIGHT-actualTop,9,wallMat);
      // Place the trim BELOW the pane's bottom edge and in front of its
      // surface. Overlapping transparent glass/mullion faces used to shimmer.
      if(baseTop>0)host.box(group,0,baseTop-1.05,6,
        opening.width+3,2,10,trim,false); // sill projection
      const glass=host.box(group,0,baseTop+glassHeight/2,0,
        opening.width-3,glassHeight,1,paneMat,false);
      glass.castShadow=false;
      host.registerGlass(opening.id,glass);
      if(opening.treatment==='bars'){
        const bars=host.solid(0x586866,.64,'metal');
        for(const frac of [-.32,-.1,.12,.34])
          host.box(group,frac*opening.width,
            baseTop+glassHeight/2,2,1.8,glassHeight+1,2.2,bars,false);
        for(const y of [baseTop+3,glassTop-3])
          host.box(group,0,y,2,opening.width-3,1.7,2.2,bars,false);
      }
      if(opening.treatment==='open-curtains'){
        const fabric=host.solid(0x8f8779,.95,'fabric');
        for(const side of [-1,1]){
          host.box(group,side*(opening.width/2-4),
            baseTop+glassHeight/2,3,
            6,glassHeight*.91,3,fabric,false);
          host.box(group,side*(opening.width/2-4),
            baseTop+glassHeight*.17,3.2,6,1.7,3.7,doorTrim,false);
        }
      }

      for(const x of [-opening.width/2,opening.width/2])
        host.box(group,x,baseTop+glassHeight/2,0,3,
          glassHeight+2,9,trim,false);
      // Architectural divisions remain thin mullions, never extra cover.
      if(style==='standard'||style==='bay')
        host.box(group,0,baseTop+glassHeight*.48,2.3,
          opening.width-4,2.4,2.2,trim,false);
      if(style==='industrial'||style==='wire'||style==='storefront'){
        for(const f of style==='storefront'?[-.25,.25]:[-.28,0,.28])
          host.box(group,f*opening.width,baseTop+glassHeight/2,2.3,
            1.6,glassHeight,2.4,trim,false);
      }
      if(style==='wire'){
        for(const y of [baseTop+4,baseTop+10,baseTop+16,baseTop+22])
          if(y<actualTop-2)host.box(group,0,y,2.3,opening.width-4,.8,1.4,trim,false);
      }
      if(style==='storefront')
        host.box(group,0,baseTop+glassHeight*.51,2.3,
          opening.width-4,1.8,2.1,trim,false);
      if(style==='awning'){
        host.box(group,0,actualTop-2,2.3,opening.width-4,2,2.4,trim,false);
        host.box(group,0,baseTop+glassHeight*.50,2.3,
          opening.width-4,1,1.5,trim,false);
      }
      if(style==='tall'||style==='clerestory')
        host.box(group,0,baseTop+1,2.3,opening.width,1.6,2.4,trim,false);
      if(style==='bay'){
        // A shallow projecting frame; the gameplay glass remains central.
        host.box(group,-opening.width*.37,baseTop+glassHeight/2,-2.3,
          2.5,glassHeight,5,trim,false);
        host.box(group,opening.width*.37,baseTop+glassHeight/2,-2.3,
          2.5,glassHeight,5,trim,false);
        host.box(group,0,baseTop,-2.3,opening.width,2,5,trim,false);
        host.box(group,0,actualTop,-2.3,opening.width,2,5,trim,false);
      }
      const half=opening.width/2;
      const edge=opening.vertical?
        {a:{x:opening.x,y:opening.y-half},
         b:{x:opening.x,y:opening.y+half}}:
        {a:{x:opening.x-half,y:opening.y},
         b:{x:opening.x+half,y:opening.y}};
      const publicWindow=!opening.interior&&accessibleExteriorWall(site,edge);
      if(publicWindow){
        host.promoteFacadeDetails(group);
        group.userData.fogFacade=true;
      }
      const nearest=site.walls.findIndex(w=>
        Math.hypot(w.a.x-opening.x,w.a.y-opening.y)<38||
        Math.hypot(w.b.x-opening.x,w.b.y-opening.y)<38);
      if(nearest>=0||publicWindow)
        host.registerWallSurface(group,nearest);
      host.root.add(group);
    }
}
