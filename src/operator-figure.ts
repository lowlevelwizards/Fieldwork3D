import * as THREE from 'three';
import type {GroundedActor} from './regional-actors.ts';
import {queryTravel} from './regional-physical.ts';
const mat=(hex:number)=>new THREE.MeshStandardMaterial({
  color:hex,roughness:.96,metalness:0,flatShading:true,
});
type Leg={hip:THREE.Group;knee:THREE.Group;ankle:THREE.Group};
export class ActorFigure{
  readonly group=new THREE.Group();
  readonly actor:GroundedActor;
  private readonly rig=new THREE.Group();
  private readonly torso=new THREE.Group();
  private readonly legs:Leg[]=[];
  private readonly arms:THREE.Group[]=[];
  private readonly materials:THREE.Material[]=[];
  private stride=0;
  private weight=0;
  private lastX:number;
  private lastZ:number;
  private lastTime:number|null=null;
  private readonly rootShadow:THREE.Mesh;
  /** Actual travelled distance drives audible steps and gait, never a
   * self-timed bob when blocked or stationary. */
  onFootfall:((x:number,z:number,wet:boolean,road:boolean)=>void)|null=null;
  private nextFootfall=.65;
  constructor(scene:THREE.Scene,actor:GroundedActor){
    this.actor=actor;this.lastX=actor.x;this.lastZ=actor.z;
    const jacket=mat(actor.team==='player'?0x53665d:
      actor.team==='commune'?0x885d56:0x60716b);
    const shade=mat(0x364a45),fabric=mat(0x686b5c);
    const boots=mat(0x313c3a),kit=mat(0xa18a61);
    const face=mat(0xbda287),accent=mat(0xc08a59);
    this.materials.push(jacket,shade,fabric,boots,kit,face,accent);
    const part=(p:THREE.Object3D,w:number,h:number,d:number,
      x:number,y:number,z:number,m:THREE.Material)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
      mesh.position.set(x,y,z);
      mesh.castShadow=true;mesh.receiveShadow=true;
      p.add(mesh);return mesh;
    };
    this.group.add(this.rig);
    // The 0.0.2 Rook silhouette is intentionally compacted to
    // physically correct 1.75m scale, rather than stretching the world.
    this.rig.scale.setScalar(.635);
    this.rig.add(this.torso);
    part(this.torso,.86,.95,.47,0,1.69,0,jacket);
    part(this.torso,.94,.22,.52,0,2.15,0,shade);
    part(this.torso,.12,.85,.07,-.25,1.72,.28,kit).rotation.z=-.28;
    part(this.torso,.35,.47,.22,.31,1.58,.34,shade);
    part(this.torso,.66,.84,.25,0,1.67,-.40,kit);
    part(this.torso,.47,.26,.28,0,2.0,-.55,kit);
    part(this.torso,.12,.45,.12,.27,2.29,-.56,shade);
    part(this.torso,.44,.42,.42,0,2.42,.04,face);
    part(this.torso,.57,.25,.54,0,2.66,.01,shade);
    part(this.torso,.57,.06,.25,0,2.59,.34,shade);
    part(this.torso,.17,.1,.05,0,2.42,.265,boots);
    for(const side of [-1,1]){
      const hip=new THREE.Group();hip.position.set(side*.245,1.23,0);
      this.rig.add(hip);
      part(hip,.33,.65,.36,0,-.33,0,fabric);
      const knee=new THREE.Group();knee.position.set(0,-.65,0);hip.add(knee);
      part(knee,.38,.52,.4,0,-.27,.03,fabric);
      const ankle=new THREE.Group();ankle.position.set(0,-.53,.04);knee.add(ankle);
      part(ankle,.4,.2,.66,0,-.012,.14,boots);
      this.legs.push({hip,knee,ankle});
      const arm=new THREE.Group();arm.position.set(side*.56,2.03,0);
      this.torso.add(arm);
      part(arm,.31,.55,.35,0,-.30,0,jacket);
      part(arm,.30,.46,.32,0,-.76,.05,fabric);
      part(arm,.33,.18,.34,0,-1.01,.08,boots);
      if(side===-1)part(arm,.345,.20,.36,0,-.37,.01,accent);
      this.arms.push(arm);
    }
    this.rootShadow=new THREE.Mesh(new THREE.CircleGeometry(.44,16),
      new THREE.MeshBasicMaterial({
        color:0x152b2c,transparent:true,opacity:.22,depthWrite:false,
      }));
    this.rootShadow.rotation.x=-Math.PI/2;
    this.rootShadow.position.y=.025;
    this.group.add(this.rootShadow);
    scene.add(this.group);
    this.update(0);
  }
  update(timeSeconds:number):void{
    const a=this.actor;
    const dx=a.x-this.lastX,dz=a.z-this.lastZ;
    const travelled=Math.hypot(dx,dz);
    const dt=this.lastTime===null?0:Math.min(.1,Math.max(0,timeSeconds-this.lastTime));
    this.lastTime=timeSeconds;this.lastX=a.x;this.lastZ=a.z;
    // The speed is the *actual* travelled distance, so a blocked
    // command cannot trigger a phantom march or footsteps.
    const speed=dt>0?travelled/dt:0;
    this.stride+=travelled*7.25;
    const desired=Math.min(1,speed/2.5);
    this.weight+=(desired-this.weight)*(1-Math.exp(-dt*11));
    const w=this.weight;
    for(let i=0;i<this.legs.length;i++){
      const phase=this.stride+i*Math.PI;
      const swing=Math.sin(phase),leg=this.legs[i];
      const reach=swing*.40*w,bend=Math.max(0,-swing)*.48*w;
      leg.hip.rotation.x=reach;
      leg.knee.rotation.x=bend;
      leg.ankle.rotation.x=-reach-bend*.65;
      leg.ankle.position.y=-.53+Math.max(0,-swing)*.12*w;
    }
    this.arms[0].rotation.x=-Math.sin(this.stride)*.27*w;
    this.arms[1].rotation.x=Math.sin(this.stride)*.27*w;
    this.torso.position.y=Math.abs(Math.sin(this.stride))*.045*w;
    this.torso.rotation.z=Math.sin(this.stride)*.025*w;
    this.torso.rotation.x=-.04*w;
    const angle=Math.atan2(Math.sin(a.heading-this.group.rotation.y),
      Math.cos(a.heading-this.group.rotation.y));
    this.group.rotation.y+=angle*(1-Math.exp(-dt*10));
    this.group.position.set(a.x,a.y,a.z);
    this.group.visible=a.health>0;
    if(travelled>0&&w>.12){
      this.nextFootfall-=travelled;
      if(this.nextFootfall<=0){
        const surface=queryTravel(a.x,a.z);
        this.onFootfall?.(a.x,a.z,surface.waterDepth>.15,surface.onRoad);
        this.nextFootfall+=.69;
      }
    }
    if(w<.01)this.nextFootfall=Math.min(this.nextFootfall,.69);
  }
  dispose(scene:THREE.Scene):void{
    scene.remove(this.group);
    this.group.traverse(o=>{
      if(o instanceof THREE.Mesh)o.geometry.dispose();
    });
    for(const m of this.materials)m.dispose();
    (this.rootShadow.material as THREE.Material).dispose();
  }
}
