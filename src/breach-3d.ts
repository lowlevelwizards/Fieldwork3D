import * as THREE from 'three';
import {W,H,WALLS,COVER,initialDoors,doorCenter,activeSite,
  isClear,type Pt} from './breach-core.ts';
import {type Site} from './breach-site.ts';
import {type Session,type TeamActor,team,isSeen,knownAt,liveVisibility} from './breach-game.ts';
import {shotVisibility} from './breach-presentation.ts';
import {doorKnown,wallKnown,coverKnown,roomKnown}
  from './breach-intel.ts';
import {handlePoint,doorReachable} from './breach-door.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {WEAPONS} from './breach-combat.ts';
import {casingAt,CASING_LIMIT,impactProfile} from './breach-effects.ts';
import {sampleThrow} from './breach-flash.ts';
import {paintFogMask,FOG_WIDTH,FOG_HEIGHT} from './breach-fog-mask.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';

/** One authoritative 2D world, physically represented in one 3D scene.
 * Coordinates: tactics (x,y) => scene (x, elevation, y).
 * This module may not mutate simulation state. */
export type ViewMode='iso'|'top'|'plan2d';
export type ViewState={mode:ViewMode;yaw:number;zoom:number;pitch:number;focus:Pt};
const color=(hex:number)=>new THREE.Color(hex);
const v=(p:Pt,y=0)=>new THREE.Vector3(p.x,y,p.y);
const mat=(hex:number,roughness=.9)=>new THREE.MeshStandardMaterial({
  color:hex,roughness,flatShading:true,
});
export class TacticalScene3D{
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.OrthographicCamera(-320,320,370,-370,.1,2800);
  readonly view:ViewState={mode:'iso',yaw:Math.PI/4,zoom:1.25,
    pitch:55*Math.PI/180,
    focus:{x:W/2,y:H/2}};
  readonly canvas:HTMLCanvasElement;
  private root=new THREE.Group();
  private fogUnknown:THREE.InstancedMesh;
  private fogExplored:THREE.InstancedMesh;
  private fogCanvas!:HTMLCanvasElement;
  private fogContext!:CanvasRenderingContext2D;
  private fogTexture!:THREE.CanvasTexture;
  private smoothFog!:THREE.Mesh;
  private actors=new Map<string,{root:THREE.Group;legs:THREE.Group[];
    arms:THREE.Group[];flash:THREE.Mesh;pack:THREE.Mesh;
    weapon:THREE.Group;status:THREE.Mesh;physical:OperatorRig;
    contactShadows:THREE.Mesh[]}>();
  private doors=new Map<string,{root:THREE.Group;leaf:THREE.Group;
    frame:THREE.Group;halo:THREE.Mesh;threshold:THREE.Mesh}>();
  private observedDoorOpen=new Map<string,number>();
  private effectCache=new Map<number,{root:THREE.Group;line:THREE.Mesh;
    impact:THREE.Mesh;chips:THREE.Mesh[];material:THREE.MeshBasicMaterial;
    impactMaterial:THREE.MeshBasicMaterial}>();
  private impactDecals=new Map<number,THREE.Mesh>();
  private casingMesh:THREE.InstancedMesh|null=null;
  private casingMatrix=new THREE.Object3D();
  private rescueFigure:THREE.Group|null=null;
  private discarded=new Map<number,THREE.Mesh>();
  private thrown=new Map<number,THREE.Mesh>();
  private detonations=new Map<number,THREE.Mesh>();
  private tracerAxis=new THREE.Vector3(0,1,0);
  private tracerGeometry=new THREE.CylinderGeometry(.65,.65,1,6);
  private impactGeometry=new THREE.IcosahedronGeometry(1,1);
  private walls:{mesh:THREE.Mesh;mid:Pt}[]=[];
  private intelSurfaces:{obj:THREE.Object3D;kind:'wall'|'cover'|'room';
    index?:number;id?:string}[]=[];
  private wallMaterials=new Set<THREE.Material>();
  private effects=new THREE.Group();
  private target=new THREE.Vector3(339,0,413);
  private currentElev=55*Math.PI/180;
  private readonly minZoom=.65;
  private readonly maxZoom=6.0;
  private lastCameraStatus='';
  private pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private ray=new THREE.Raycaster();
  private width=1;private height=1;private fogAt=-1;
  private sun:THREE.DirectionalLight;
  private mats:THREE.Material[]=[];
  private solid=(hex:number,roughness=.9)=>{
    const material=mat(hex,roughness);this.mats.push(material);return material;
  };
  constructor(){
    const canvas=document.createElement('canvas');
    canvas.id='breach3dCanvas';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;'+
      'pointer-events:none;z-index:0;display:block';
    document.body.insertBefore(canvas,document.body.firstChild);
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,
      alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    // Atmospheric distance fog was tinting every interior surface in ISO.
    // Visibility is handled separately by authoritative exploration tiles.
    this.scene.background=color(0x182a2a);
    this.scene.fog=null;
    this.scene.add(new THREE.HemisphereLight(0xdde8df,0x24302e,1.18));
    this.sun=new THREE.DirectionalLight(0xf4dab4,2.35);
    this.sun.position.set(-100,260,180);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{
      left:-320,right:320,top:320,bottom:-320,near:.5,far:800,
    });this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.08;
    this.scene.add(this.sun,this.sun.target);
    this.scene.add(this.root,this.effects);
    this.buildWorld();
    if(activeSite())this.view.zoom=1.48;
    // Architectural silhouettes remain visible (as in the 2D map), but
    // unknown cells are strongly darkened. Unseen soldiers and door states
    // are separately visibility-gated, so a huge opaque 'roof' is unnecessary.
    const fgeom=new THREE.PlaneGeometry(40.4,40.4);
    fgeom.rotateX(-Math.PI/2);
    const unknownMat=new THREE.MeshBasicMaterial({
      color:0x071416,side:THREE.DoubleSide,transparent:true,
      opacity:.52,depthWrite:false});
    const exploredMat=new THREE.MeshBasicMaterial({
      color:0x071819,side:THREE.DoubleSide,transparent:true,
      opacity:.18,depthWrite:false});
    this.mats.push(unknownMat,exploredMat);
    this.fogUnknown=new THREE.InstancedMesh(fgeom,unknownMat,16*19);
    this.fogExplored=new THREE.InstancedMesh(fgeom,exploredMat,16*19);
    this.fogUnknown.frustumCulled=this.fogExplored.frustumCulled=false;
    this.fogUnknown.renderOrder=16;this.fogExplored.renderOrder=16;
    this.root.add(this.fogUnknown,this.fogExplored);
    this.fogUnknown.count=0;this.fogExplored.count=0;
    this.fogCanvas=document.createElement('canvas');
    this.fogCanvas.width=FOG_WIDTH;this.fogCanvas.height=FOG_HEIGHT;
    const context=this.fogCanvas.getContext('2d');
    if(!context)throw Error('Fog canvas unavailable');
    this.fogContext=context;
    this.fogTexture=new THREE.CanvasTexture(this.fogCanvas);
    this.fogTexture.minFilter=THREE.LinearFilter;
    this.fogTexture.magFilter=THREE.LinearFilter;
    const fogMat=new THREE.MeshBasicMaterial({
      map:this.fogTexture,transparent:true,depthWrite:false,
      side:THREE.DoubleSide});
    this.mats.push(fogMat);
    this.smoothFog=new THREE.Mesh(new THREE.PlaneGeometry(W,H),fogMat);
    this.smoothFog.rotation.x=-Math.PI/2;
    this.smoothFog.position.set(W/2,36.2,H/2);
    this.smoothFog.renderOrder=16;
    this.scene.add(this.smoothFog);
    this.resize(innerWidth,innerHeight);
  }
  private box(parent:THREE.Object3D,x:number,y:number,z:number,
    w:number,h:number,d:number,material:THREE.Material,cast=true){
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;
    parent.add(o);return o;
  }
  private plane(parent:THREE.Object3D,x:number,z:number,w:number,d:number,
    y:number,material:THREE.Material){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  /** New mission replaces *only* architectural meshes. Soldiers and
   * camera remain alive, avoiding a WebGL context restart on each site.
   */
  applySite(site:Site|null){
    this.root.children.filter(c=>c!==this.fogUnknown&&
      c!==this.fogExplored).forEach(child=>{
      child.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
      this.root.remove(child);
    });
    for(const material of this.wallMaterials)material.dispose();
    this.wallMaterials.clear();
    this.walls.length=0;this.doors.clear();
    this.intelSurfaces.length=0;
    this.observedDoorOpen.clear();
    for(const cache of [this.impactDecals,this.discarded,
      this.thrown,this.detonations]){
      for(const mesh of cache.values()){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      cache.clear();
    }
    this.buildWorld(site);
    this.root.add(this.fogUnknown,this.fogExplored);
    this.fogAt=-1;
    this.resetCamera();
  }
  private buildGenerated(site:Site){
    const palettes=[0x817b69,0x5b746d,0x79705f,0x616e65];
    const earth=this.solid(site.layout==='courtyard'?0x465348:0x34443e);
    this.plane(this.root,W/2,H/2,W,H,-2,earth);
    const road=this.solid(0x59584a);
    this.box(this.root,site.entrance.x,-1,
      (site.entrance.y+H)/2,85,1,H-site.entrance.y+10,road,false);
    for(const room of site.rooms){
      const group=new THREE.Group();this.root.add(group);
      this.intelSurfaces.push({obj:group,kind:'room',id:room.id});
      const base=this.solid(room.kind==='hall'?0x495b55:
        palettes[room.tone%palettes.length]);
      this.box(group,room.x+room.w/2,-.8,room.y+room.h/2,
        room.w-2,1.6,room.h-2,base,false);
      const grout=this.solid(0x8d9282);
      for(let x=room.x+22;x<room.x+room.w-8;x+=29)
        this.box(group,x,-.01,room.y+room.h/2,
          .65,.1,room.h-7,grout,false);
      for(let y=room.y+22;y<room.y+room.h-8;y+=29)
        this.box(group,room.x+room.w/2,-.01,y,
          room.w-7,.1,.65,grout,false);
    }
    const wallMat=this.solid(0xa89c81),capMat=this.solid(0x474439);
    const skirting=this.solid(0x39463f);
    for(const [index,wall] of site.walls.entries()){
      const group=new THREE.Group();this.root.add(group);
      this.intelSurfaces.push({obj:group,kind:'wall',index});
      const {a,b}=wall,len=Math.hypot(b.x-a.x,b.y-a.y);
      if(len<5)continue;
      const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
      const angle=-Math.atan2(b.y-a.y,b.x-a.x);
      const individualWall=wallMat.clone();
      this.wallMaterials.add(individualWall);
      const body=this.box(group,x,20,z,len+1,40,9,individualWall);
      body.rotation.y=angle;
      this.walls.push({mesh:body,mid:{x,y:z}});
      const foot=this.box(group,x,2,z,len+1,4,12,skirting,false);
      foot.rotation.y=angle;
      const individualCap=capMat.clone();
      this.wallMaterials.add(individualCap);
      const cap=this.box(group,x,40.3,z,len+2,2,11,individualCap,false);
      cap.rotation.y=angle;this.walls.push({mesh:cap,mid:{x,y:z}});
    }
    const doorMat=this.solid(0xb18b5f),doorTrim=this.solid(0xe0c390);
    const metal=this.solid(0x586665);
    for(const door of site.doors){
      const length=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door),vertical=Math.abs(door.a.x-door.b.x)<1;
      const root=new THREE.Group();root.position.set(p.x,0,p.y);
      root.rotation.y=vertical?-Math.PI/2:0;
      const frame=new THREE.Group();root.add(frame);
      this.box(frame,-length/2,18.5,0,4,37,10,doorTrim);
      this.box(frame,length/2,18.5,0,4,37,10,doorTrim);
      this.box(frame,0,37,0,length+7,4,12,doorTrim);
      const threshold=this.box(frame,0,.32,0,length,1.2,13,
        doorTrim,false);
      const leaf=new THREE.Group();
       const invert=door.hinge==='b';leaf.position.x=invert?length/2:-length/2;
      // Actual hinge barrels identify the swing side without requiring
      // a user to inspect a top-down arrow on every doorway.
      for(const y of [7,18,29])
        this.box(frame,invert?length/2:-length/2,y,0,
          4.2,5.2,6,metal,false);
      root.add(leaf);
      this.box(leaf,(door.hinge==='b'?-1:1)*length/2,17,0,length-4,34,4,doorMat);
      this.box(leaf,(door.hinge==='b'?-1:1)*length*.7,18,3,3,3,2,metal,false);
       this.box(leaf,(door.hinge==='b'?-1:1)*length*.7,18,-3,3,3,2,metal,false);
      const halo=new THREE.Mesh(new THREE.RingGeometry(
        length*.55,length*.66,32),new THREE.MeshBasicMaterial({
        color:0xe1c38b,transparent:true,opacity:.95,
        side:THREE.DoubleSide,depthWrite:false}));
      halo.rotation.x=-Math.PI/2;halo.position.y=1.8;
      halo.visible=false;root.add(halo);this.mats.push(halo.material);
      this.root.add(root);
      this.doors.set(door.id,{root,leaf,frame,halo,threshold});
      this.observedDoorOpen.set(door.id,door.openFraction??0);
    }
    const wood=this.solid(0x655748),steel=this.solid(0x465958);
    const olive=this.solid(0x70715e);
    site.cover.forEach((c,i)=>{
      const group=new THREE.Group();this.root.add(group);
      this.intelSurfaces.push({obj:group,kind:'cover',index:i});
      const fixture=c.fixture??'crate';
      const material=i%3===0?wood:i%3===1?steel:olive;
      const w=c.w,d=c.h;
      if(['bed','exam-bed','guest'].includes(fixture)){
        this.box(group,c.x,5,c.y,w,8,d,material);
        this.box(group,c.x,9.6,c.y,w-3,2.8,d-3,olive,false);
        this.box(group,c.x-w*.32,11.2,c.y,w*.22,2,d*.7,steel,false);
      }else if(['table','desk','counter','workbench','cart'].includes(fixture)){
        const top=fixture==='counter'?14:fixture==='workbench'?13:11;
        this.box(group,c.x,top,c.y,w,3,d,material);
        for(const sx of [-1,1])for(const sz of [-1,1])
          this.box(group,c.x+sx*(w/2-3),top/2,c.y+sz*(d/2-3),
            3,top,3,steel);
        if(fixture==='counter')this.box(group,c.x,6,c.y,w-5,9,d-5,wood);
      }else if(['shelf','cabinet','locker','machine'].includes(fixture)){
        this.box(group,c.x,13.5,c.y,w,27,d,material);
        for(const level of [7,15,22])
          this.box(group,c.x,level,c.y+d/2+1,w-4,1.2,2,steel,false);
      }else if(fixture==='vehicle'){
        this.box(group,c.x,9,c.y,w,17,d,steel);
        this.box(group,c.x-w*.1,21,c.y,w*.54,10,d*.73,steel);
        for(const sx of [-1,1])for(const sz of [-1,1])
          this.box(group,c.x+sx*w*.32,3,c.y+sz*d*.49,
            w*.15,6,4,wood);
      }else if(fixture==='chair'||fixture==='bench'){
        this.box(group,c.x,8,c.y,w,3,d,wood);
        this.box(group,c.x-w*.44,14,c.y,3,15,d,material);
      }else if(fixture==='fence'){
        for(const sx of [-1,1])this.box(group,c.x+sx*w*.47,11,c.y,
          3,22,3,wood);
        for(const h of [7,17])this.box(group,c.x,h,c.y,w,2,3,steel,false);
      }else{
        const tall=c.low?12:27;
        this.box(group,c.x,tall/2,c.y,w,tall,d,material);
        if(fixture==='pallet')
          for(const h of [2,7,12])this.box(group,c.x,h,c.y,w+2,2,d+2,wood,false);
      }
    });
    // Glass does not impede sight; the low sill does impede traversal.
    const paneMat=new THREE.MeshStandardMaterial({
      color:0xa7bdb9,roughness:.25,transparent:true,opacity:.35,
      side:THREE.DoubleSide,depthWrite:false});
    this.mats.push(paneMat);
    for(const opening of site.windows??[]){
      const group=new THREE.Group();
      group.position.set(opening.x,0,opening.y);
      group.rotation.y=opening.vertical?-Math.PI/2:0;
      this.box(group,0,7,0,opening.width,14,9,wallMat);
      this.box(group,0,35,0,opening.width,10,9,wallMat);
      const glass=this.box(group,0,23,0,opening.width-3,18,1,paneMat,false);
      glass.castShadow=false;
      for(const x of [-opening.width/2,opening.width/2])
        this.box(group,x,23,0,3,20,9,doorTrim,false);
      const nearest=site.walls.findIndex(w=>
        Math.hypot(w.a.x-opening.x,w.a.y-opening.y)<38||
        Math.hypot(w.b.x-opening.x,w.b.y-opening.y)<38);
      if(nearest>=0)this.intelSurfaces.push({obj:group,kind:'wall',index:nearest});
      this.root.add(group);
    }
    // Important: avoid visual-only furniture outside authoritative cover.
  }
  private buildWorld(site=activeSite()){
    const earth=this.solid(0x34443e),road=this.solid(0x5d6358);
    const gravel=this.solid(0x6c7061),floorA=this.solid(0x817d6b);
    const floorB=this.solid(0x526b68),timber=this.solid(0x4b4437);
    const metal=this.solid(0x525e5d,.62),rust=this.solid(0x715e4d);
    const roof=this.solid(0x515d58),glass=this.solid(0x748b83,.18);
    if(site){this.buildGenerated(site);return;}
    this.plane(this.root,W/2,H/2,W,H,-2,earth);
    this.box(this.root,303,-1,630,124,1,215,road,false);
    this.box(this.root,294,-.15,643,7,.2,178,gravel,false);
    this.box(this.root,355,-.15,643,8,.2,178,gravel,false);
    // Two genuinely distinct interior floor constructions.
    this.box(this.root,247,-.65,316,270,1.5,432,floorA,false);
    this.box(this.root,485,-.65,316,207,1.5,432,floorB,false);
    const tile=this.solid(0x9a9683);
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
    this.root.add(strips);
    const crossGrout=new THREE.InstancedMesh(
      new THREE.BoxGeometry(1,.10,27),tile,grout.length);
    grout.forEach((p,i)=>{
      transform.position.set(p.x,-.04,p.y);transform.updateMatrix();
      crossGrout.setMatrixAt(i,transform.matrix);
    });
    crossGrout.instanceMatrix.needsUpdate=true;
    crossGrout.receiveShadow=true;this.root.add(crossGrout);
    // Each wall is one real mesh. Simulation geometry remains authoritative.
    for(let i=0;i<WALLS.length;i++){
      const segment=WALLS[i];
      const p1=segment.a,p2=segment.b;
      const dx=p2.x-p1.x,dz=p2.y-p1.y;
      const len=Math.hypot(dx,dz);
      const mesh=this.box(this.root,(p1.x+p2.x)/2,20,(p1.y+p2.y)/2,
        len+3,40,9,this.solid(i===4?0x81877d:0xb4a991));
      mesh.rotation.y=-Math.atan2(dz,dx);
      this.walls.push({mesh,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2}});
      // Dark skirting separates the wall footprint from similar floor values.
      const skirting=this.box(this.root,mesh.position.x,2,mesh.position.z,
        len+4,4,12,this.solid(0x36453f),false);
      skirting.rotation.y=mesh.rotation.y;
      // A dark, legible wall cap communicates height in either camera mode.
      const cap=this.box(this.root,mesh.position.x,40,mesh.position.z,
        len+4,2,11,this.solid(0x51483a),false);cap.rotation.y=mesh.rotation.y;
      this.walls.push({mesh:cap,mid:{x:mesh.position.x,y:mesh.position.z}});
    }
    for(const x of [209,502]){
      const pane=this.box(this.root,x+25,16,99,51,21,2,glass,false);
      this.box(this.root,x+25,28,97,56,2,5,timber,false);
      this.box(this.root,x+25,4,97,56,2,5,timber,false);
      pane.castShadow=false;
    }
    // 080: Doorways are real stateful meshes, not slabs that disappear.
    const doorMat=this.solid(0xab8655),doorTrim=this.solid(0xe0c28c);
    const thresholdMat=this.solid(0xc19b5c);
    for(const door of initialDoors()){
      const width=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door),vertical=Math.abs(door.a.x-door.b.x)<1;
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      group.rotation.y=vertical?-Math.PI/2:0;
      const frame=new THREE.Group();group.add(frame);
      this.box(frame,-width/2,18.5,0,4,37,10,doorTrim);
      this.box(frame,width/2,18.5,0,4,37,10,doorTrim);
      this.box(frame,0,37,0,width+7,4,12,doorTrim);
      const threshold=this.box(frame,0,.32,0,width,1.2,13,thresholdMat,false);
      const hinge=new THREE.Group();hinge.position.x=door.hinge==='b'?width/2:-width/2;
      group.add(hinge);
      this.box(hinge,(door.hinge==='b'?-1:1)*width/2,17,0,width-3,34,4,doorMat);
      this.box(hinge,(door.hinge==='b'?-1:1)*width*.7,18,2.6,3,4,2,doorTrim,false);
       this.box(hinge,(door.hinge==='b'?-1:1)*width*.7,18,-2.6,3,4,2,doorTrim,false);
      const halo=new THREE.Mesh(
        new THREE.RingGeometry(width*.56,width*.66,32),
        new THREE.MeshBasicMaterial({color:0xe3bc7d,transparent:true,
          opacity:.95,depthWrite:false,side:THREE.DoubleSide}));
      halo.rotation.x=-Math.PI/2;halo.position.set(0,1.7,0);
      halo.visible=false;group.add(halo);this.mats.push(halo.material);
      this.root.add(group);
      this.doors.set(door.id,{root:group,leaf:hinge,frame,halo,threshold});
      this.observedDoorOpen.set(door.id,0);
    }
    // Furniture height matches cover classification: low crates vs high cabinets.
    for(let i=0;i<COVER.length;i++){
      const c=COVER[i],height=c.low?11:27;
      this.box(this.root,c.x,height/2,c.y,c.w,height,c.h,
        i%3===0?metal:i%3===1?timber:rust);
      if(c.low){
        this.box(this.root,c.x,height+1,c.y,c.w-5,2,c.h-5,roof,false);
        for(let j=0;j<3;j++)
          this.box(this.root,c.x-c.w/3+j*c.w/3,height+2,c.y,
            2,3,c.h-4,timber,false);
      }else{
        for(let j=0;j<3;j++)
          this.box(this.root,c.x-c.w/3+j*c.w/3,height*.55,c.y+c.h/2+.8,
            1,8,2,metal,false);
      }
    }
    // Authored practical scenery beyond the collision boxes.
    const objects=[
      [190,143,32,17,12],[232,458,44,13,19],[440,306,21,25,20],
      [510,340,48,12,16],[175,570,62,14,26],[489,653,46,16,33],
    ];
    for(const [x,z,w,h,d] of objects){
      this.box(this.root,x,h/2,z,w,h,d,timber);
      this.box(this.root,x,h+.5,z,w+2,1,d+2,metal,false);
    }
    // Yard fence with actual posts, worn cross rails, perimeter clutter.
    for(const x of [62,608])for(let z=90;z<=560;z+=45){
      this.box(this.root,x,11,z,4,22,4,timber);
      if(z<545)this.box(this.root,x,13,z+22,2,2,44,rust,false);
    }
    const barrel=this.solid(0x6b7369),barrelTop=this.solid(0x343c39);
    for(const [x,z] of [[170,653],[473,654],[545,701],[102,656],
      [116,557],[548,574]]){
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(10,10,20,9),barrel);
      cyl.position.set(x,10,z);cyl.castShadow=true;this.root.add(cyl);
      const top=new THREE.Mesh(new THREE.CylinderGeometry(10.1,10.1,2,9),barrelTop);
      top.position.set(x,21,z);this.root.add(top);
    }
    // Small intentional vegetation grouped around the outside boundaries.
    const foliage=[this.solid(0x526749),this.solid(0x64724d),
      this.solid(0x4b5f4b)],stem=this.solid(0x565546);
    for(let i=0;i<105;i++){
      const x=15+((i*73)%607),z=21+((i*129)%697);
      if(x>107&&x<595&&z>98&&z<545)continue;
      if(Math.abs(x-303)<73&&z>525)continue;
      const m=this.box(this.root,x,3.5,z,2,7,2,stem,false);
      const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),
        foliage[i%3]);bush.position.set(x,9,z);
      bush.scale.set(6+(i%5)*2,6+(i%4)*2,7+(i%3)*2);
      bush.castShadow=i%4===0;this.root.add(bush);
      void m;
    }
    // Exterior hardware makes the station identifiable as a real place.
    const pole=this.solid(0x655e4d);
    for(const [x,z] of [[84,150],[603,510]]){
      this.box(this.root,x,52,z,5,104,5,pole);
      this.box(this.root,x,98,z,37,3,3,timber);
    }
    // A translucent roof lip gives silhouette without covering any rooms.
    const lip=this.box(this.root,352,36,100,474,5,18,roof,false);
    lip.castShadow=false;
    this.box(this.root,348,35,535,460,3,13,roof,false);
  }
  resize(w:number,h:number){
    this.width=Math.max(1,w);this.height=Math.max(1,h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.45));
    this.renderer.setSize(this.width,this.height,false);
    this.updateCamera(1);
  }
  setMode(mode:ViewMode){
    this.view.mode=mode;
    if(mode==='top')this.view.pitch=Math.PI/2;
    else if(mode==='iso')this.view.pitch=55*Math.PI/180;
    this.canvas.style.display=mode==='plan2d'?'none':'block';
    this.fogAt=-1;
    this.updateCamera(1);
  }
  /** Yaw is always around the current map focus, never the selected unit. */
  setYaw(angle:number){
    this.view.yaw=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    this.updateCamera(1);
  }
  rotate(delta:number){this.setYaw(this.view.yaw+delta);}
  orbit(dx:number,dy:number){
    // The world follows the finger: dragging right moves the orbit left,
    // and dragging downward lowers the camera angle (toward the horizon).
    // Yaw and pitch must use the same hand-directed convention.
    if(this.view.mode==='plan2d')return;
    this.view.mode='iso';
    this.view.pitch=THREE.MathUtils.clamp(
      this.view.pitch-dy*.004,35*Math.PI/180,Math.PI/2);
    this.setYaw(this.view.yaw-dx*.007);
  }
  /** A reset is a predictable full-board fit, independent of unit selection. */
  resetCamera(){
    this.view.focus={x:W/2,y:H/2};this.view.yaw=Math.PI/4;
    this.view.zoom=activeSite()?1.48:1.25;
    this.view.pitch=this.view.mode==='top'?Math.PI/2:55*Math.PI/180;
    this.updateCamera(1);
  }
  /**
   * Drag world beneath a finger rather than guessing using camera-right/up
   * vectors. Works at any pitch/yaw including near-vertical overhead.
   */
  panBetween(prevX:number,prevY:number,nextX:number,nextY:number){
    this.updateCamera(0);
    const original=this.screenToWorld(prevX,prevY);
    const destination=this.screenToWorld(nextX,nextY);
    if(!original||!destination)return;
    this.shiftFocus(original.x-destination.x,original.y-destination.y);
  }
  pan(dx:number,dy:number){
    this.panBetween(this.width/2,this.height/2,
      this.width/2+dx,this.height/2+dy);
  }
  private shiftFocus(dx:number,dy:number){
    const marginX=140,marginY=150;
    this.view.focus.x=THREE.MathUtils.clamp(
      this.view.focus.x+dx,-marginX,W+marginX);
    this.view.focus.y=THREE.MathUtils.clamp(
      this.view.focus.y+dy,-marginY,H+marginY);
    this.updateCamera(0);
  }
  /**
   * Pinch/wheel zoom preserves the world point beneath the gesture centroid.
   * Does not recenter to a soldier or jump to the center of the map.
   */
  zoomAt(factor:number,x:number,y:number){
    if(!Number.isFinite(factor)||factor<=0)return;
    this.updateCamera(0);
    const before=this.screenToWorld(x,y);
    this.view.zoom=THREE.MathUtils.clamp(this.view.zoom*factor,
      this.minZoom,this.maxZoom);
    this.updateCamera(0);
    if(before){
      const after=this.screenToWorld(x,y);
      if(after)this.shiftFocus(before.x-after.x,before.y-after.y);
    }
  }
  updateCamera(dt:number){
    const targetElev=this.view.pitch;
    const blend=1-Math.exp(-Math.max(0,dt)*13);
    this.currentElev=THREE.MathUtils.lerp(this.currentElev,targetElev,blend);
    if(Math.abs(this.currentElev-targetElev)<.0001)
      this.currentElev=targetElev;
    this.target.set(this.view.focus.x,0,this.view.focus.y);
    const angle=this.view.yaw;
    const radius=1200;
    this.camera.position.set(
      this.target.x+radius*Math.cos(this.currentElev)*Math.sin(angle),
      this.target.y+radius*Math.sin(this.currentElev),
      this.target.z+radius*Math.cos(this.currentElev)*Math.cos(angle));
    // Fixed map-facing 'north' avoids the top-down up-vector singularity.
    // Right = positive X at yaw 0; orbit never flips at 90-degree pitch.
    this.camera.up.set(-Math.sin(angle),0,-Math.cos(angle));
    this.camera.lookAt(this.target);
    const aspect=this.width/this.height;
    const diagonal=Math.hypot(W,H);
    // A yaw-invariant fit avoids breathing/scale changes while orbiting.
    const baseSpan=Math.max(820,(diagonal+66)/aspect);
    const span=baseSpan/this.view.zoom;
    this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;
    this.camera.top=span/2;this.camera.bottom=-span/2;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    // Lightweight observability for touch regression tests and camera QA.
    const signature=[
      this.view.mode,this.view.zoom.toFixed(3),this.view.yaw.toFixed(3),
      this.view.pitch.toFixed(3),this.view.focus.x.toFixed(2),
      this.view.focus.y.toFixed(2),
    ].join('|');
    if(signature!==this.lastCameraStatus){
      this.lastCameraStatus=signature;
      this.canvas.dataset.cameraMode=this.view.mode;
      this.canvas.dataset.cameraZoom=this.view.zoom.toFixed(3);
      this.canvas.dataset.cameraYaw=this.view.yaw.toFixed(3);
      this.canvas.dataset.cameraPitch=this.view.pitch.toFixed(3);
      this.canvas.dataset.cameraFocusX=this.view.focus.x.toFixed(2);
      this.canvas.dataset.cameraFocusY=this.view.focus.y.toFixed(2);
    }
  }
  screenToWorld(sx:number,sy:number):Pt|null{
    if(this.view.mode==='plan2d')return null;
    const ndc=new THREE.Vector2(sx/this.width*2-1,1-sy/this.height*2);
    this.ray.setFromCamera(ndc,this.camera);
    const p=new THREE.Vector3();
    if(!this.ray.ray.intersectPlane(this.pickPlane,p))return null;
    if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
    return {x:p.x,y:p.z};
  }
  project(p:Pt,y=4):Pt{
    const world=v(p,y).project(this.camera);
    return {x:(world.x+1)*this.width/2,
      y:(1-world.y)*this.height/2};
  }
  private soldier(a:TeamActor){
    const physical=createOperatorRig(a.id,a.side);
    const {root,weapon,pack}=physical;
    const legs=physical.legacyLegs,arms=physical.legacyArms;
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(3.5),
      new THREE.MeshBasicMaterial({color:0xffd59e,transparent:true,
        opacity:.94,depthWrite:false}));
    // Flash belongs to the firearm, not an independent actor-root guess.
    flash.position.set(19.5,0,0);flash.visible=false;weapon.add(flash);
    const status=new THREE.Mesh(new THREE.RingGeometry(12,16,30),
      new THREE.MeshBasicMaterial({color:0xdb8d76,transparent:true,
        opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
    status.rotation.x=-Math.PI/2;status.visible=false;
    this.scene.add(root,status);
    // Subtle cheap foot-contact shadows complement the real shadow map on
    // small mobile screens, where the filtered shadow can otherwise vanish.
    const contactShadows=[0,1].map(()=>{
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(7,14),
        new THREE.MeshBasicMaterial({color:0x0b1515,transparent:true,
          opacity:.20,depthWrite:false}));
      shadow.rotation.x=-Math.PI/2;shadow.position.y=.15;
      this.scene.add(shadow);return shadow;
    });
    this.actors.set(a.id,{root,legs,arms,flash,pack,weapon,status,
      physical,contactShadows});
  }
  update(s:Session,selected:string,dt:number,
    focusedDoorId:string|null=null,omniscient=false,
    replay?:ReplayPresentation|null){
    if(this.view.mode==='plan2d')return;
    this.updateCamera(dt);
    this.fogAt+=dt;
    // The shadow map follows the active encounter to retain contact detail.
    const shadowPoint=team(s).find(a=>a.id===selected)?.p??this.view.focus;
    this.sun.position.set(shadowPoint.x-145,250,shadowPoint.y+175);
    this.sun.target.position.set(shadowPoint.x,0,shadowPoint.y);
    this.sun.target.updateMatrixWorld();
    // Hide undiscovered geometry at object level, including its shadows.
    // Fog shading alone is insufficient: it leaks shapes and cover positions.
    for(const item of this.intelSurfaces){
      item.obj.visible=omniscient||(
        item.kind==='wall'?wallKnown(s.intel,item.index!):
        item.kind==='cover'?coverKnown(s.intel,item.index!):
        roomKnown(s.intel,item.id!));
    }
    // For camera-facing walls use translucent near-side cutaways.
    const fromCamera=this.camera.position.clone().sub(this.target);
    for(const wall of this.walls){
      const pawn=team(s).find(a=>a.id===selected)?.p??this.view.focus;
      const between=(wall.mid.x-pawn.x)*fromCamera.x+
        (wall.mid.y-pawn.y)*fromCamera.z;
      const cut=this.view.mode==='iso'&&between>1800;
      const material=wall.mesh.material as THREE.MeshStandardMaterial;
      if(material.transparent!==cut){
        material.transparent=cut;material.opacity=cut?.10:1;
        material.depthWrite=!cut;material.needsUpdate=true;
      }
    }
    for(const door of s.doors){
      const object=this.doors.get(door.id);
      if(!object)continue;
      object.root.visible=omniscient||doorKnown(s.intel,door.id);
      // Freeze the last observed door state when it drops out of view:
      // a guard opening an unseen door may not broadcast its exact state.
      if(omniscient||liveVisibility(s,doorCenter(door)))
        this.observedDoorOpen.set(door.id,door.openFraction??(door.open?1:0));
      const fraction=omniscient?(door.openFraction??(door.open?1:0)):
        (s.intel.doorMemory.get(door.id)??0);
      const replayProgress=replay?.doors[door.id];
      // The rendered leaf follows the authoritative hinge rather than
      // a render-rate easing curve that disagrees with collision.
      object.leaf.rotation.y=(door.swing??-1)*
        (replayProgress??fraction)*1.36;
      const selectedActor=team(s).find(a=>a.id===selected);
      const reachable=selectedActor&&selectedActor.health>0&&
        [selectedActor.p,...selectedActor.plan.map(n=>n.p)].some(p=>
          doorReachable(p,door));
      object.halo.visible=object.root.visible&&focusedDoorId===door.id&&!!reachable&&
        (liveVisibility(s,doorCenter(door))||
         knownAt(s,doorCenter(door).x,doorCenter(door).y));
      object.halo.rotation.z+=dt*.3;
    }
    // Switching procedurally generated sites may change hostile counts.
    // Hide cached actors absent from the new encounter.
    const current=new Set(s.operators.map(a=>a.id));
    for(const [id,object] of this.actors)if(!current.has(id)){
      object.root.visible=false;object.status.visible=false;
      for(const shadow of object.contactShadows)shadow.visible=false;
    }
    if(s.rescue){
      if(!this.rescueFigure){
        this.rescueFigure=new THREE.Group();
        const civilian=new THREE.Mesh(new THREE.CapsuleGeometry(4.5,12,4,8),
          new THREE.MeshStandardMaterial({color:0xe0c58d,flatShading:true}));
        civilian.position.y=10;
        const head=new THREE.Mesh(new THREE.SphereGeometry(4.8,8,6),
          new THREE.MeshStandardMaterial({color:0xb99b7b,flatShading:true}));
        head.position.y=23;
        this.rescueFigure.add(civilian,head);
        this.scene.add(this.rescueFigure);
      }
      this.rescueFigure.visible=omniscient||liveVisibility(s,s.rescue.p);
      this.rescueFigure.position.set(s.rescue.p.x,0,s.rescue.p.y);
    }else if(this.rescueFigure)this.rescueFigure.visible=false;
    for(const actor of s.operators){
      if(!this.actors.has(actor.id))this.soldier(actor);
      const object=this.actors.get(actor.id)!;
      object.root.visible=omniscient||actor.side==='blue'||
        (actor.health>0?isSeen(s,actor):liveVisibility(s,actor.p));
      const hitTime=s.seconds-actor.lastHitAt;
      const down=actor.health<=0;
      object.status.visible=object.root.visible&&
        !down&&(hitTime>=0&&hitTime<.28);
      if(object.status.visible){
        object.status.position.set(actor.p.x,1.15,actor.p.y);
        const pulse=down?1.15:1+.45*(1-hitTime/.28);
        object.status.scale.setScalar(pulse);
        const statusMat=object.status.material as THREE.MeshBasicMaterial;
        statusMat.opacity=down ? .85 :Math.max(0,1-hitTime/.28);
        statusMat.color.setHex(down?0xd99e83:0xf4c7aa);
      }
      if(!object.root.visible)continue;
      object.root.position.set(actor.p.x,0,actor.p.y);
      // Build 120: the pose solver is the only writer of actor anatomical,
      // firearm and hit-reaction transforms; the scene owns world placement.
      const downProgress=actor.health<=0?
        Math.min(1,Math.max(0,(s.seconds-actor.lastDownAt)/.58)):0;
      const hitAge=s.seconds-actor.lastHitAt;
      const hitFade=actor.health>0&&hitAge>=0&&hitAge<.32?
        1-hitAge/.32:0;
      const reloadDuration=actor.reloadDuration||
        WEAPONS[actor.weapon].reload*
        (actor.injuryStage===2?1.5:actor.injuryStage===1?1.1:1);
      const firing=s.shots.find(shot=>shot.shooterId===actor.id&&
        shot.age<.115&&(omniscient||shotVisibility(s,shot).flash));
      object.flash.visible=!!firing&&actor.health>0;
      if(firing){
        object.flash.scale.setScalar(1.55*(1-firing.age/.115)+.3);
      }
      const plannedDoor=actor.plan[0]?.kind==='door'?
        s.doors.find(d=>d.id===actor.plan[0].doorId):undefined;
      const activeDoor=plannedDoor??(actor.lastDoorId?
        s.doors.find(d=>d.id===actor.lastDoorId):undefined);
      const handle=activeDoor?handlePoint(activeDoor):undefined;
      poseOperator(object.physical,{
        x:actor.p.x,z:actor.p.y,heading:actor.heading,
        velocity:actor.velocity,seconds:s.seconds,stride:actor.stride,
        deterministic:!!replay,replayFeet:replay?.feet[actor.id],
        pelvisYaw:replay?.pelvisYaw[actor.id],
        travelYaw:replay?.travelYaw[actor.id],
        posture:actor.posture,injury:actor.injuryStage,weapon:actor.weapon,
        reload:actor.reload,reloadDuration,
        reloadMode:actor.reloadMode,
        reloadRemoved:actor.reloadRemoved,
        reloadInserted:actor.reloadInserted,
        lastThrowAt:actor.lastThrowAt,lastDoorAt:actor.lastDoorAt,
        doorMethod:actor.lastDoorMethod,
        doorPoint:handle?{x:handle.x,y:handle.y}:undefined,
        down:actor.health<=0,surrender:actor.surrendered,
        aiming:actor.aim>.20,turning:actor.turning,firing:!!firing,
        aimBlend:actor.aim,recoil:actor.recoil*6,
        shotHeading:actor.weaponYaw,hitAge,hitFade,downProgress,
        hitRegion:actor.lastHitRegion,hitYaw:actor.lastHitYaw,
        hitSeverity:actor.lastHitSeverity,downPose:actor.downPose,
        flashActive:actor.flashUntil>s.seconds&&actor.health>0,
        obstruction:!isClear(actor.p,{
          x:actor.p.x+Math.cos(actor.heading)*
            (actor.weapon==='rifle'?46:actor.weapon==='shotgun'?42:31),
          y:actor.p.y+Math.sin(actor.heading)*
            (actor.weapon==='rifle'?46:actor.weapon==='shotgun'?42:31)
        },s.doors),
        friendlyNear:s.operators.some(other=>{
          if(other===actor||other.side!==actor.side||other.health<=0)return false;
          const dx=other.p.x-actor.p.x,dy=other.p.y-actor.p.y;
          return Math.hypot(dx,dy)<48&&
            dx*Math.cos(actor.heading)+dy*Math.sin(actor.heading)>18;
        })
      },dt);
      object.root.updateMatrixWorld(true);
      for(let i=0;i<2;i++){
        const shadow=object.contactShadows[i];
        shadow.visible=actor.health>0&&object.root.visible;
        if(!shadow.visible)continue;
        const shoe=new THREE.Vector3();
        object.physical.feet[i].shoe.getWorldPosition(shoe);
        shadow.position.set(shoe.x,.16,shoe.z);
        shadow.scale.setScalar(object.physical.feet[i].swinging?.74:1);
      }
    }
    if(!this.casingMesh){
      // One draw call for the entire retained casing pool.
      this.casingMesh=new THREE.InstancedMesh(
        new THREE.CylinderGeometry(.75,.75,3.1,6),
        new THREE.MeshStandardMaterial({color:0xc7a361,
          metalness:.46,roughness:.48}),CASING_LIMIT);
      this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.casingMesh.frustumCulled=false;
      this.effects.add(this.casingMesh);
    }
    const casingDraw=this.casingMesh;
    let count=0;
    for(const brass of s.casings){
      if(!omniscient&&!liveVisibility(s,{x:brass.x,y:brass.z}))continue;
      const p=casingAt(brass,s.seconds);
      this.casingMatrix.position.set(p.x,p.y,p.z);
      this.casingMatrix.rotation.set(.9,p.rotation,1.2);
      const factor=brass.weapon==='shotgun'?1.45:
        brass.weapon==='smg'?.73:brass.weapon==='rifle'?1.2:1;
      this.casingMatrix.scale.set(factor,factor,factor);
      this.casingMatrix.updateMatrix();
      casingDraw.setMatrixAt(count++,this.casingMatrix.matrix);
    }
    casingDraw.count=count;
    if(count)casingDraw.instanceMatrix.needsUpdate=true;
    // 079: One persistent, ID-keyed effect per actual simulation shot.
    // Shared geometry and bounded per-shot materials avoid frame-by-frame GC.
    const active=new Set<number>();
    for(const shot of s.shots){
      const visibility=omniscient?
        {flash:true,trace:true,impact:true}:shotVisibility(s,shot);
      if(!visibility.flash&&!visibility.trace&&!visibility.impact)continue;
      active.add(shot.id);
      let effect=this.effectCache.get(shot.id);
      if(!effect){
        const root=new THREE.Group();
        const material=new THREE.MeshBasicMaterial({
          color:shot.side==='blue'?0xffde9d:0xff9b73,
          transparent:true,depthTest:true,depthWrite:false});
        const impactMaterial=new THREE.MeshBasicMaterial({
          color:shot.surface==='blood'?0xa65a4e:
            shot.surface==='metal'?0xffd697:
            shot.surface==='wood'?0xdfb27a:
            shot.surface==='stone'?0xbeb9a2:0xe2d3b1,
          transparent:true,depthTest:true,depthWrite:false});
        const line=new THREE.Mesh(this.tracerGeometry,material);
        const impact=new THREE.Mesh(this.impactGeometry,impactMaterial);
        root.add(line,impact);
        const chips:THREE.Mesh[]=[];
        if(shot.surface==='wood'||shot.surface==='stone'||
          shot.surface==='metal'||shot.surface==='blood'){
          for(let i=0;i<(shot.surface==='blood'?4:3);i++){
            const chip=new THREE.Mesh(this.tracerGeometry,impactMaterial);
            chip.scale.set(shot.surface==='blood'?.9:.42,
              shot.surface==='blood'?1.9:shot.surface==='wood'?4.2:2.4,
              shot.surface==='blood'?.9:.42);
            root.add(chip);chips.push(chip);
          }
        }
        this.effects.add(root);
        effect={root,line,impact,chips,material,impactMaterial};
        this.effectCache.set(shot.id,effect);
      }
      const start=v(shot.start,shot.muzzleHeight??15),
        end=v(shot.end,shot.impactHeight??12);
      const flight=end.clone().sub(start);
      effect.line.position.copy(start).addScaledVector(flight,.5);
      effect.line.scale.set(1,flight.length(),1);
      effect.line.quaternion.setFromUnitVectors(
        this.tracerAxis,flight.normalize());
      effect.line.visible=visibility.trace&&shot.age<.19;
      effect.material.opacity=Math.max(0,1-shot.age/.20);
      effect.impact.position.copy(end);
      const profile=impactProfile(shot.surface??'dust');
      const pulse=shot.surface==='blood'?5.2:
        shot.surface==='wood'?3.6:shot.surface==='metal'?3.1:2.5;
      effect.impact.scale.setScalar(pulse*(1+.5*shot.age/.40));
      effect.impactMaterial.opacity=Math.max(0,1-shot.age/profile.lifetime);
      effect.impact.visible=visibility.impact&&shot.age<.40;
      for(let i=0;i<effect.chips.length;i++){
        const chip=effect.chips[i];
        const theta=(shot.id*2.41+i*2.094);
        const progress=shot.age/.40;
        const radius=(2+15*progress)*(shot.surface==='blood'?.7:1);
        chip.position.set(end.x+Math.cos(theta)*radius,
          Math.max(2,end.y+6*Math.sin(Math.PI*progress)+i*1.5-4*progress),
          end.z+Math.sin(theta)*radius);
        chip.rotation.set(i*.73,theta,Math.PI*.5+progress*1.8);
        chip.visible=visibility.impact&&shot.age<profile.lifetime;
      }
    }
    // Surface-hit marks remain for 24 simulation seconds and are always
    // derived from authoritative collision outcomes. Bounded to 92.
    const currentMarks=new Set<number>();
    for(const mark of s.impactMarks){
      if(!omniscient&&!liveVisibility(s,mark.p))continue;
      currentMarks.add(mark.id);
      let mesh=this.impactDecals.get(mark.id);
      if(!mesh){
        const dark=mark.surface==='blood'?0x763c38:
          mark.surface==='wood'?0x3a2920:
          mark.surface==='stone'?0x38332c:
          mark.surface==='metal'?0x202b2e:0x514e42;
        mesh=new THREE.Mesh(new THREE.CircleGeometry(1,9),
          new THREE.MeshBasicMaterial({color:dark,transparent:true,
            opacity:.85,depthWrite:false,side:THREE.DoubleSide}));
        mesh.rotation.x=-Math.PI/2;
        this.impactDecals.set(mark.id,mesh);this.effects.add(mesh);
      }
      mesh.position.set(mark.p.x,mark.height??1,mark.p.y);
      mesh.scale.setScalar(mark.surface==='blood'?4:2.3);
      (mesh.material as THREE.MeshBasicMaterial).opacity=
        Math.max(.19,.82-mark.age*.025);
    }
    // Retained physical magazines, grenades in flight and expanding flashes.
    const activeMag=new Set<number>();
    for(const mag of s.dropped){
      activeMag.add(mag.id);
      let mesh=this.discarded.get(mag.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.BoxGeometry(6,1.5,3),
          new THREE.MeshStandardMaterial({color:0x313b37,roughness:.75}));
        this.discarded.set(mag.id,mesh);this.effects.add(mesh);
      }
      const t=Math.min(1.5,mag.age);
      mesh.position.set(mag.p.x+Math.sin(mag.id)*t*3.5,
        Math.max(1.1,7+10*t-27*t*t),mag.p.y+
          Math.cos(mag.id)*t*2.7);
      mesh.rotation.set(.2*Math.min(1,t*8),mag.id*2.13,
        Math.min(1,t*4)*Math.PI*.40);
    }
    const liveGrenades=new Set<number>();
    for(const grenade of s.grenades){
      liveGrenades.add(grenade.id);
      let mesh=this.thrown.get(grenade.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(2.7,0),
          new THREE.MeshStandardMaterial({color:0x879184,roughness:.75}));
        this.thrown.set(grenade.id,mesh);this.effects.add(mesh);
      }
      const t=Math.min(1,grenade.age/.55);
      const path=grenade.path?sampleThrow(grenade.path,t):null;
      mesh.position.set(grenade.p.x,path?.height??(1+20*4*t*(1-t)),
        grenade.p.y);
    }
    const liveBursts=new Set<number>();
    for(const burst of s.flashBursts){
      liveBursts.add(burst.id);
      let mesh=this.detonations.get(burst.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),
          new THREE.MeshBasicMaterial({color:0xfff1c7,transparent:true,
            opacity:.8,depthWrite:false}));
        this.detonations.set(burst.id,mesh);this.effects.add(mesh);
      }
      mesh.position.set(burst.p.x,13,burst.p.y);
      mesh.scale.setScalar(5+70*burst.age);
      (mesh.material as THREE.MeshBasicMaterial).opacity=
        Math.max(0,.78*(1-burst.age/.7));
    }
    for(const [cache,activeIds] of [
      [this.impactDecals,currentMarks],
      [this.discarded,activeMag],[this.thrown,liveGrenades],
      [this.detonations,liveBursts],
    ] as [Map<number,THREE.Mesh>,Set<number>][])
      for(const [id,mesh] of cache)if(!activeIds.has(id)){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();cache.delete(id);
      }
    for(const [id,effect] of this.effectCache){
      if(active.has(id))continue;
      this.effects.remove(effect.root);
      effect.material.dispose();effect.impactMaterial.dispose();
      this.effectCache.delete(id);
    }
    // Shared continuous occlusion mask. Hidden geometry remains gated by
    // intelligence and must not leak through texture transparency.
    this.fogUnknown.count=0;this.fogExplored.count=0;
    this.smoothFog.visible=!omniscient;
    if(!omniscient&&(this.fogAt>=.16||this.fogAt<0)){
      this.fogAt=0;
      paintFogMask(this.fogContext,s);
      this.fogTexture.needsUpdate=true;
    }else if(omniscient)this.fogAt=-1;
    this.renderer.render(this.scene,this.camera);
    // Effects geometry is released before rebuilding the next frame; pooled
    // material instances are reused for every shot to reduce phone GC work.
  }
}
