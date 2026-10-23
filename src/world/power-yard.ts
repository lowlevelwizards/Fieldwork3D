import * as THREE from 'three';
import { terrainHeight } from './ground';
import type { Obstacle, Point2 } from '../navigation/grid';
import { PowerNetwork, type StationId } from '../systems/power-network';

export type ServiceStation = {
  id: StationId;
  location: Point2;
  standPoint: Point2;
  labelPoint: THREE.Vector3;
  hitbox: THREE.Mesh;
};
const std = (c: number, emission = 0) => new THREE.MeshStandardMaterial({
  color:c,emissive:emission,metalness:.24,roughness:.8,flatShading:true,
});
const box=(g:THREE.Object3D,m:THREE.Material,w:number,h:number,d:number,x:number,y:number,z:number)=>{
  const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;
};

/** Handcrafted, lightweight physical representation of a coupled facility. */
export class PowerYard {
  readonly stations: Record<StationId,ServiceStation>;
  private readonly generatorRotor = new THREE.Group();
  private readonly breakerArm = new THREE.Group();
  private readonly junctionCover = new THREE.Group();
  private readonly sourceLamp: THREE.Mesh;
  private readonly switchLamp: THREE.Mesh;
  private readonly junctionLamp: THREE.Mesh;
  private readonly workLamp: THREE.Mesh;
  private readonly smoke: THREE.Mesh[] = [];
  private readonly cableRuns: { from:StationId;to:StationId;material:THREE.MeshStandardMaterial }[]=[];
  private readonly shedLights: THREE.Mesh[] = [];
  private readonly humLamp: THREE.PointLight;
  private lastGeneratorOn = false;
  private readonly serviceGuide: THREE.Group;
  constructor(scene: THREE.Scene, obstacles: Obstacle[]) {
    const olive=std(0x607367),steel=std(0x394e4c),dark=std(0x2b3f41),
      cream=std(0xbbb28d),rust=std(0x95724c),glass=std(0x656b63,0x1b2e25);
    const create=(id:StationId,x:number,z:number,standingZ:number,w:number,h:number,d:number):THREE.Group=>{
      const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);scene.add(g);
      const hitbox=new THREE.Mesh(new THREE.BoxGeometry(w+1.1,h+.7,d+1.15),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
      hitbox.position.set(0,h/2,.1);g.add(hitbox);
      this.stations[id]={
        id,location:{x,z},standPoint:{x,z:standingZ},
        labelPoint:new THREE.Vector3(x,g.position.y+h+1.05,z),hitbox
      };
      if(id!=='mast')obstacles.push({kind:'box',x,z,halfX:w*.53,halfZ:d*.53});
      return g;
    };
    // Assign in a deliberately linear order so all footprints are registered
    // before pathfinding rebuilds its occupancy grid.
    this.stations={} as Record<StationId,ServiceStation>;
    this.serviceGuide=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.RingGeometry(.75,.88,28),
      new THREE.MeshBasicMaterial({color:0xe6c882,transparent:true,opacity:.70,
        side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;
    this.serviceGuide.add(ring);
    const center=new THREE.Mesh(new THREE.SphereGeometry(.095,6,5),
      new THREE.MeshBasicMaterial({color:0xffe1a1}));
    center.position.y=.22;
    this.serviceGuide.add(center);
    this.serviceGuide.visible=false;
    scene.add(this.serviceGuide);
    const generator=create('generator',-18,-7.5,-5.4,3.2,2.25,2.2);
    box(generator,steel,3.45,.33,2.55,0,.24,0);
    box(generator,olive,2.6,1.58,1.85,0,1.12,0);
    box(generator,dark,.86,1.68,1.92,1.18,1.15,0);
    for(let i=0;i<6;i++)box(generator,dark,1.55,.085,.1,-.47,.65+i*.19,1.00);
    box(generator,cream,1.27,.24,.1,-.52,1.86,1.0);
    for(const side of [-1,1]) {
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,.42,10),dark);
      cyl.rotation.z=Math.PI/2;cyl.position.set(side*1.18,.67,.03);generator.add(cyl);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.46,8),rust);
      hub.rotation.z=Math.PI/2;hub.position.copy(cyl.position);generator.add(hub);
    }
    generator.add(this.generatorRotor);
    this.generatorRotor.position.set(0.90,1.25,1.02);
    const fan=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.10,8),dark);
    fan.rotation.x=Math.PI/2;this.generatorRotor.add(fan);
    for(let i=0;i<4;i++){
      const blade=box(this.generatorRotor,cream,.1,.54,.06,0,0,.10);blade.rotation.z=i*Math.PI/2;
    }
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.14,.19,1.64,7),dark);
    pipe.position.set(-.83,2.36,-.55);generator.add(pipe);
    for(let i=0;i<4;i++){
      const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.19+i*.035,0),
        new THREE.MeshStandardMaterial({color:0x89918a,transparent:true,opacity:0,
          depthWrite:false,flatShading:true}));
      puff.position.set(-.83,3.2,-.55);generator.add(puff);this.smoke.push(puff);
    }
    this.sourceLamp=new THREE.Mesh(new THREE.SphereGeometry(.10,8,6),glass);
    this.sourceLamp.position.set(.75,1.80,1.01);generator.add(this.sourceLamp);

    const gear=create('switchgear',-3,-6.7,-4.85,1.9,2.8,1.15);
    box(gear,olive,1.85,2.7,1.1,0,1.35,0);
    box(gear,steel,1.55,2.32,.10,0,1.38,.61);
    for(let i=0;i<3;i++)box(gear,cream,1.2,.08,.13,0,.65+i*.46,.70);
    gear.add(this.breakerArm);this.breakerArm.position.set(.31,1.55,.72);
    box(this.breakerArm,rust,.21,.66,.24,0,.28,0);
    box(gear,cream,.48,.19,.15,-.43,2.31,.69);
    this.switchLamp=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),glass);
    this.switchLamp.position.set(-.39,1.96,.74);gear.add(this.switchLamp);

    const joint=create('junction',24,-23,-20.8,1.9,1.95,1.1);
    box(joint,steel,1.9,1.8,1.1,0,.97,0);
    box(joint,olive,1.64,1.56,.15,0,1.02,.62);
    joint.add(this.junctionCover);this.junctionCover.position.set(-.8,1.03,.71);
    box(this.junctionCover,cream,1.5,.12,.12,.79,.10,.05);
    for(let i=0;i<3;i++)box(joint,rust,.26,.44,.12,-.45+i*.45,.94,.74);
    this.junctionLamp=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),glass);
    this.junctionLamp.position.set(.62,1.70,.65);joint.add(this.junctionLamp);

    // Existing cabinet and mast retain their own meshes and collision.
    this.stations.relay={
      id:'relay', location:{x:1.3,z:-9.3},standPoint:{x:1.3,z:-7.98},
      labelPoint:new THREE.Vector3(1.3,terrainHeight(1.3,-9.3)+3.35,-9.3),
      hitbox:null as unknown as THREE.Mesh
    };
    this.stations.mast={
      id:'mast',location:{x:29,z:-19},standPoint:{x:29,z:-16.7},
      labelPoint:new THREE.Vector3(29,terrainHeight(29,-19)+5.4,-19),
      hitbox:null as unknown as THREE.Mesh
    };
    const mastHitbox=new THREE.Mesh(new THREE.BoxGeometry(4.5,11,4.5),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    mastHitbox.position.set(29,terrainHeight(29,-19)+5.5,-19);
    scene.add(mastHitbox);this.stations.mast.hitbox=mastHitbox;
    const lampBox=box(gear,glass,.22,.19,.20,.52,2.14,.68);
    this.workLamp=lampBox;
    this.humLamp=new THREE.PointLight(0xffc78a,0,8,2);
    this.humLamp.position.set(-3,terrainHeight(-3,-6.7)+2.7,-6.7);scene.add(this.humLamp);

    // Cable runs are actual contiguous 3D paths across the yard, not UI lines.
    // Tall timber poles support slightly sagging insulated spans.
    const nodes=[
      {id:'generator' as StationId,x:-18,z:-7.5},
      {id:'switchgear' as StationId,x:-3,z:-6.7},
      {id:'relay' as StationId,x:1.3,z:-9.3},
      {id:'junction' as StationId,x:24,z:-23},
      {id:'mast' as StationId,x:29,z:-19},
    ];
    for(let i=0;i<nodes.length-1;i++){
      const a=nodes[i],b=nodes[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);
      const spans=Math.max(1,Math.ceil(length/10));
      const posts:[number,number][]=[];
      for(let j=0;j<=spans;j++){
        const t=j/spans,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        posts.push([x,z]);
        if(j===0||j===spans)continue;
        const pole=new THREE.Group();pole.position.set(x,terrainHeight(x,z),z);scene.add(pole);
        box(pole,rust,.20,5.1,.23,0,2.55,0);
        box(pole,steel,1.15,.12,.17,0,5.05,0);
        for(const side of [-1,1])box(pole,cream,.18,.35,.2,side*.41,5.23,0);
      }
      const pts:THREE.Vector3[]=[];
      for(let j=0;j<posts.length-1;j++){
        const [x,z]=posts[j], [nx,nz]=posts[j+1];
        for(let k=0;k<=8;k++){
          if(j>0&&k===0)continue;
          const t=k/8,px=x+(nx-x)*t,pz=z+(nz-z)*t;
          const h=5.18-Math.sin(Math.PI*t)*.27;
          pts.push(new THREE.Vector3(px,terrainHeight(px,pz)+h,pz));
        }
      }
      const cableMaterial=std(0x434f4a);
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,.055,5,false),cableMaterial);
      scene.add(tube);this.cableRuns.push({from:a.id,to:b.id,material:cableMaterial});
    }
    for(let i=0;i<4;i++){
      const l=new THREE.Mesh(new THREE.BoxGeometry(.29,.14,.29),
        new THREE.MeshStandardMaterial({color:0x988f78,emissive:0xf0bd76,emissiveIntensity:0}));
      l.position.set(-7.1+i*1.26,terrainHeight(-7.1+i*1.26,-8.6)+3.1,-8.6);
      scene.add(l);this.shedLights.push(l);
    }
  }

  showServiceGuide(id:StationId|null,seconds:number){
    this.serviceGuide.visible=id!==null;
    if(!id)return;
    const p=this.stations[id].location;
    this.serviceGuide.position.set(p.x,terrainHeight(p.x,p.z)+.15,p.z);
    this.serviceGuide.scale.setScalar(1+Math.sin(seconds*2.8)*.06);
  }

  /** Bind the existing relay's selection surface, avoiding duplicate cabinet mesh. */
  setRelayHitbox(hitbox:THREE.Mesh){this.stations.relay.hitbox=hitbox;}

  update(network:PowerNetwork,dt:number,seconds:number){
    const power=network.energized;
    this.generatorRotor.rotation.z+=network.generatorRunning?dt*9:dt*.08;
    this.breakerArm.rotation.x+=((network.breakerClosed?0:-.68)-this.breakerArm.rotation.x)*.18;
    this.junctionCover.rotation.y+=((network.fault==='junction'&&!network.repaired?-.15:0)-this.junctionCover.rotation.y)*.14;
    const glow=(obj:THREE.Mesh,on:boolean)=>{
      const m=obj.material as THREE.MeshStandardMaterial;
      m.color.setHex(on?0xe7c991:0x877663);
      m.emissive.setHex(on?0xe0a25e:0x322319);
      m.emissiveIntensity=on?1.6:.08;
    };
    glow(this.sourceLamp,network.generatorRunning);
    glow(this.switchLamp,network.voltageAt('switchgear')>0);
    glow(this.junctionLamp,network.voltageAt('junction')>0);
    glow(this.workLamp,network.voltageAt('switchgear')>0);
    this.humLamp.intensity=power.has('switchgear')?0.50:0;
    for(const l of this.shedLights)glow(l,power.has('switchgear'));
    for(const wire of this.cableRuns){
      const on=power.has(wire.from)&&power.has(wire.to);
      wire.material.color.setHex(on?0x9b855b:0x3f504b);
      wire.material.emissive.setHex(on?0x473d21:0x000000);
      wire.material.emissiveIntensity=on?.32:0;
    }
    if(network.generatorRunning!==this.lastGeneratorOn)this.lastGeneratorOn=network.generatorRunning;
    this.smoke.forEach((puff,i)=>{
      const t=(seconds*.27+i*.25)%1;
      puff.visible=network.generatorRunning;
      puff.position.y=3.20+t*3;
      puff.position.x=-.83+Math.sin(seconds*.5+i)*t*.38;
      puff.scale.setScalar(.75+t*1.7);
      (puff.material as THREE.MeshStandardMaterial).opacity=network.generatorRunning?(1-t)*.17:0;
    });
    if(network.transientArc>0)this.junctionLamp.scale.setScalar(1+network.transientArc*2);
    else this.junctionLamp.scale.setScalar(1);
  }
}
