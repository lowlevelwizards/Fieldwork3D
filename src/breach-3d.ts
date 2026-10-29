import * as THREE from 'three';
import {W,H,WALLS,COVER,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,team,isSeen,knownAt,liveVisibility} from './breach-game.ts';

/** One authoritative 2D world, physically represented in one 3D scene.
 * Coordinates: tactics (x,y) => scene (x, elevation, y).
 * This module may not mutate simulation state. */
export type ViewMode='iso'|'top'|'plan2d';
export type ViewState={mode:ViewMode;yaw:number;zoom:number;focus:Pt};
const color=(hex:number)=>new THREE.Color(hex);
const v=(p:Pt,y=0)=>new THREE.Vector3(p.x,y,p.y);
const mat=(hex:number,roughness=.9)=>new THREE.MeshStandardMaterial({
  color:hex,roughness,flatShading:true,
});
export class TacticalScene3D{
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.OrthographicCamera(-320,320,370,-370,.1,2800);
  readonly view:ViewState={mode:'iso',yaw:Math.PI/4,zoom:1.02,
    focus:{x:339,y:413}};
  readonly canvas:HTMLCanvasElement;
  private root=new THREE.Group();
  private fogUnknown:THREE.InstancedMesh;
  private fogExplored:THREE.InstancedMesh;
  private actors=new Map<string,{root:THREE.Group;legs:THREE.Group[];
    arms:THREE.Group[];flash:THREE.Mesh;pack:THREE.Mesh}>();
  private doors=new Map<string,THREE.Group>();
  private walls:{mesh:THREE.Mesh;mid:Pt}[]=[];
  private effects=new THREE.Group();
  private target=new THREE.Vector3(339,0,413);
  private currentElev=55*Math.PI/180;
  private pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private ray=new THREE.Raycaster();
  private width=1;private height=1;private fogAt=-1;
  private sun:THREE.DirectionalLight;
  private mats:THREE.Material[]=[];
  private shotFriendly:THREE.MeshStandardMaterial;
  private shotHostile:THREE.MeshStandardMaterial;
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
    this.renderer.toneMappingExposure=1.14;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene.background=color(0x5b6c65);
    this.scene.fog=new THREE.Fog(0x82968c,620,1600);
    this.scene.add(new THREE.HemisphereLight(0xc6d8cb,0x3b493f,2.2));
    this.sun=new THREE.DirectionalLight(0xf2ddbb,2.4);
    this.sun.position.set(-100,260,180);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{
      left:-450,right:450,top:450,bottom:-450,near:.5,far:800,
    });this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.08;
    this.scene.add(this.sun);
    this.scene.add(this.root,this.effects);
    this.buildWorld();
    this.shotFriendly=this.solid(0xece0b6,.3);
    this.shotHostile=this.solid(0xe3a185,.3);
    const fgeom=new THREE.PlaneGeometry(40.4,40.4);
    fgeom.rotateX(-Math.PI/2);
    const unknownMat=new THREE.MeshBasicMaterial({
      color:0x09191c,side:THREE.DoubleSide,transparent:true,
      opacity:.82,depthWrite:false});
    const exploredMat=new THREE.MeshBasicMaterial({
      color:0x13272b,side:THREE.DoubleSide,transparent:true,
      opacity:.38,depthWrite:false});
    this.mats.push(unknownMat,exploredMat);
    this.fogUnknown=new THREE.InstancedMesh(fgeom,unknownMat,16*19);
    this.fogExplored=new THREE.InstancedMesh(fgeom,exploredMat,16*19);
    this.fogUnknown.frustumCulled=this.fogExplored.frustumCulled=false;
    this.fogUnknown.renderOrder=16;this.fogExplored.renderOrder=16;
    this.root.add(this.fogUnknown,this.fogExplored);
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
  private buildWorld(){
    const earth=this.solid(0x566750),road=this.solid(0x686452);
    const gravel=this.solid(0x797263),floorA=this.solid(0x6e6a5e);
    const floorB=this.solid(0x606b64),timber=this.solid(0x544d40);
    const metal=this.solid(0x646a65,.62),rust=this.solid(0x806851);
    const roof=this.solid(0x515d58),glass=this.solid(0x748b83,.18);
    this.plane(this.root,W/2,H/2,W,H,-2,earth);
    this.box(this.root,303,-1,630,124,1,215,road,false);
    this.box(this.root,294,-.15,643,7,.2,178,gravel,false);
    this.box(this.root,355,-.15,643,8,.2,178,gravel,false);
    // Two genuinely distinct interior floor constructions.
    this.box(this.root,247,-.65,316,270,1.5,432,floorA,false);
    this.box(this.root,485,-.65,316,207,1.5,432,floorB,false);
    const tile=this.solid(0xbdb3a1);
    for(let x=122;x<580;x+=28)for(let z=114;z<523;z+=28){
      this.box(this.root,x,-.05,z,27,.10,1,tile,false);
      if(x===374||x===402)continue;
    }
    // Each wall is one real mesh. Simulation geometry remains authoritative.
    for(let i=0;i<WALLS.length;i++){
      const segment=WALLS[i];
      const p1=segment.a,p2=segment.b;
      const dx=p2.x-p1.x,dz=p2.y-p1.y;
      const len=Math.hypot(dx,dz);
      const mesh=this.box(this.root,(p1.x+p2.x)/2,15.5,(p1.y+p2.y)/2,
        len+3,31,9,this.solid(i===4?0x7e8274:0xa59b81));
      mesh.rotation.y=-Math.atan2(dz,dx);
      this.walls.push({mesh,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2}});
      // A dark, legible wall cap communicates height in either camera mode.
      const cap=this.box(this.root,mesh.position.x,32,mesh.position.z,
        len+4,2,11,this.solid(0x50493c),false);cap.rotation.y=mesh.rotation.y;
      this.walls.push({mesh:cap,mid:{x:mesh.position.x,y:mesh.position.z}});
    }
    for(const x of [209,502]){
      const pane=this.box(this.root,x+25,16,99,51,21,2,glass,false);
      this.box(this.root,x+25,28,97,56,2,5,timber,false);
      this.box(this.root,x+25,4,97,56,2,5,timber,false);
      pane.castShadow=false;
    }
    // Trim and doorway thresholds: open door turns at a real hinge.
    const doorMat=this.solid(0x977b57);
    for(const [id,p] of [['FRONT',{x:303,y:532}],['INNER',{x:382,y:325}]] as const){
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      const vertical=id==='INNER';
      this.box(group,0,13,0,vertical?7:52,26,vertical?42:7,doorMat);
      this.box(group,0,24,0,vertical?10:56,2,vertical?46:10,timber,false);
      this.root.add(group);this.doors.set(id,group);
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
    this.canvas.style.display=mode==='plan2d'?'none':'block';
    this.fogAt=-1;
  }
  setYaw(angle:number){this.view.yaw=angle;this.updateCamera(1);}
  pan(dx:number,dy:number){
    // Screen pan independent of camera yaw, in true world coordinates.
    const z=this.view.zoom,rate=(740/this.height)/z;
    const right=new THREE.Vector3();
    const forward=new THREE.Vector3();
    this.camera.updateMatrixWorld();
    right.setFromMatrixColumn(this.camera.matrixWorld,0);
    forward.setFromMatrixColumn(this.camera.matrixWorld,1);
    this.view.focus.x-=dx*rate*right.x+dy*rate*forward.x;
    this.view.focus.y-=dx*rate*right.z+dy*rate*forward.z;
    this.view.focus.x=THREE.MathUtils.clamp(this.view.focus.x,0,W);
    this.view.focus.y=THREE.MathUtils.clamp(this.view.focus.y,0,H);
    this.updateCamera(1);
  }
  updateCamera(dt:number){
    const targetElev=this.view.mode==='top'?Math.PI/2-.004:55*Math.PI/180;
    const blend=1-Math.exp(-Math.max(0,dt)*10);
    this.currentElev=THREE.MathUtils.lerp(this.currentElev,targetElev,blend);
    this.target.set(this.view.focus.x,0,this.view.focus.y);
    const angle=this.view.yaw;
    const radius=1000;
    this.camera.position.set(
      this.target.x+radius*Math.cos(this.currentElev)*Math.sin(angle),
      this.target.y+radius*Math.sin(this.currentElev),
      this.target.z+radius*Math.cos(this.currentElev)*Math.cos(angle));
    this.camera.up.set(0,1,0);
    // Up orientation is world-stable in top-down so rotation remains intuitive.
    this.camera.lookAt(this.target);
    const span=750/this.view.zoom;
    const aspect=this.width/this.height;
    this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;
    this.camera.top=span/2;this.camera.bottom=-span/2;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
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
    const root=new THREE.Group();
    const suit=this.solid(a.side==='blue'?(a.id==='rook'?0x5b8075:0x768675):0x8d6356);
    const dark=this.solid(0x2e3b3b),olive=this.solid(0x55614f),
      straps=this.solid(0x343a31),helmet=this.solid(0x606d5f);
    this.box(root,0,12,0,10,14,8,suit);
    this.box(root,0,22,0,9,6,8,helmet);
    this.box(root,0,25,1,12,2,10,helmet,false);
    const pack=this.box(root,0,13,-7,9,12,6,olive);
    this.box(root,0,15,5,9,8,2,straps);
    for(const x of [-5,5]){
      this.box(root,x,14,1,2,11,3,olive);
    }
    const legs:THREE.Group[]=[],arms:THREE.Group[]=[];
    for(const side of [-1,1]){
      const hip=new THREE.Group();hip.position.set(side*3,7,0);
      this.box(hip,0,-2,0,4,8,5,dark);
      this.box(hip,0,-7,2,5,3,7,straps);
      root.add(hip);legs.push(hip);
      const arm=new THREE.Group();arm.position.set(side*7,18,2);
      this.box(arm,0,-3,2,3,9,3,suit);
      root.add(arm);arms.push(arm);
    }
    // Rifle points in +X (world tactics heading=0).
    const weapon=this.box(root,15,15,4,25,3,4,dark);
    this.box(root,23,15,4,7,1.6,2.5,straps);
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(4),
      new THREE.MeshBasicMaterial({color:0xffde97,transparent:true,opacity:.96,
        depthWrite:false}));
    flash.position.set(28,15,4);flash.visible=false;root.add(flash);
    this.scene.add(root);this.actors.set(a.id,{root,legs,arms,flash,pack});
    void weapon;
  }
  update(s:Session,selected:string,dt:number){
    if(this.view.mode==='plan2d')return;
    this.updateCamera(dt);
    this.fogAt+=dt;
    // For camera-facing walls use translucent near-side cutaways.
    const fromCamera=this.camera.position.clone().sub(this.target);
    for(const wall of this.walls){
      const pawn=team(s).find(a=>a.id===selected)?.p??this.view.focus;
      const between=(wall.mid.x-pawn.x)*fromCamera.x+
        (wall.mid.y-pawn.y)*fromCamera.z;
      const cut=this.view.mode==='iso'&&between>3500;
      const material=wall.mesh.material as THREE.MeshStandardMaterial;
      if(material.transparent!==cut){
        material.transparent=cut;material.opacity=cut?.22:1;
        material.depthWrite=!cut;material.needsUpdate=true;
      }
    }
    for(const door of s.doors){
      const object=this.doors.get(door.id);
      if(object){
        object.visible=!door.open;
        object.rotation.y=door.open?(door.id==='FRONT'?.8:-.8):0;
      }
    }
    for(const actor of s.operators){
      if(!this.actors.has(actor.id))this.soldier(actor);
      const object=this.actors.get(actor.id)!;
      object.root.visible=actor.side==='blue'||isSeen(s,actor);
      if(!object.root.visible)continue;
      object.root.position.set(actor.p.x,0,actor.p.y);
      object.root.rotation.y=-actor.heading;
      const speed=Math.min(1,actor.velocity/70);
      const gait=Math.sin(s.seconds*10.5+(actor.id==='moss'?1.1:0));
      object.legs[0].rotation.x=gait*speed*.44;
      object.legs[1].rotation.x=-gait*speed*.44;
      object.arms[0].rotation.x=-gait*speed*.12;
      object.arms[1].rotation.x=gait*speed*.12;
      object.root.position.y=actor.posture==='crouch'?-5:0;
      object.root.scale.y=actor.health<=0?.33:1;
      object.flash.visible=s.sparks.some(e=>e.side===actor.side&&
        Math.hypot(actor.p.x-e.p.x,actor.p.y-e.p.y)<7&&e.age<.09);
      object.root.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});
    }
    // Fire traces are visual evidence of the simulation, not independent shots.
    this.effects.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    this.effects.clear();
    const friendly=this.shotFriendly,hostile=this.shotHostile;
    for(const shot of s.shots){
      const a=v(shot.start,14),b=v(shot.end,9);
      const mid=a.clone().add(b).multiplyScalar(.5);
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,
        a.distanceTo(b),5),shot.side==='blue'?friendly:hostile);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
        b.clone().sub(a).normalize());
      cyl.material.transparent=true;
      cyl.material.opacity=Math.max(0,1-shot.age/.24);
      this.effects.add(cyl);
      const impact=new THREE.Mesh(new THREE.SphereGeometry(shot.hit?4:2,6,4),
        shot.hit?hostile:friendly);
      impact.position.copy(b);this.effects.add(impact);
    }
    // Reuse the same current sight and exploration state that drives 2D fog.
    if(this.fogAt>=.18||this.fogAt<0){
      this.fogAt=0;
      const temp=new THREE.Object3D();
      let unk=0,explored=0;
      for(let row=0;row<19;row++)for(let col=0;col<16;col++){
        const p={x:col*40+20,y:row*40+20};
        const seen=liveVisibility(s,p);
        const past=knownAt(s,p.x,p.y);
        if(seen)continue;
        temp.position.set(p.x,42,p.y);temp.updateMatrix();
        if(past)this.fogExplored.setMatrixAt(explored++,temp.matrix);
        else this.fogUnknown.setMatrixAt(unk++,temp.matrix);
      }
      this.fogUnknown.count=unk;this.fogExplored.count=explored;
      this.fogUnknown.instanceMatrix.needsUpdate=true;
      this.fogExplored.instanceMatrix.needsUpdate=true;
    }
    this.renderer.render(this.scene,this.camera);
    // Effects geometry is released before rebuilding the next frame; pooled
    // material instances are reused for every shot to reduce phone GC work.
  }
}
