import * as THREE from 'three';
import {groundHeight} from './study-world.ts';

const damp=(from:number,to:number,speed:number,dt:number)=>
  THREE.MathUtils.lerp(from,to,1-Math.exp(-speed*dt));
const mat=(color:number)=>new THREE.MeshStandardMaterial({
  color,roughness:.96,metalness:0,flatShading:true,
});
type Limb={joint:THREE.Group;ankle:THREE.Group};
export class StudySoldier{
  readonly group=new THREE.Group();
  private readonly body=new THREE.Group();
  private readonly legs:Limb[]=[];
  private readonly arms:THREE.Group[]=[];
  private readonly materials:THREE.Material[]=[];
  private stride=0;
  private speedBlend=0;
  private lowBlend=0;
  private facing=0;
  private readonly shadow:THREE.Mesh;
  private geometry:THREE.BufferGeometry[]=[];
  constructor(scene:THREE.Scene){
    const coat=mat(0x626c53),cloth=mat(0x434e40),dark=mat(0x303a33);
    const tan=mat(0x90816b),metal=mat(0x353b37),skin=mat(0xa48a6c);
    const olive=mat(0x70765a),strap=mat(0x3d4034);
    this.materials.push(coat,cloth,dark,tan,metal,skin,olive,strap);
    const part=(parent:THREE.Object3D,
      size:[number,number,number],pos:[number,number,number],
      material:THREE.Material)=>{
      const g=new THREE.BoxGeometry(...size);this.geometry.push(g);
      const o=new THREE.Mesh(g,material);o.position.set(...pos);
      o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
    };
    this.group.add(this.body);
    // Soldier dimensions 1.82m: every part attached to a real joint.
    part(this.body,[.48,.61,.31],[0,1.13,0],coat);
    part(this.body,[.51,.19,.34],[0,1.38,0],olive);
    part(this.body,[.52,.16,.34],[0,.80,.0],strap);
    // Chest rig, magazine pouches and belt, not floating detail.
    part(this.body,[.43,.32,.12],[0,1.13,.20],tan);
    for(const x of [-.14,0,.14])
      part(this.body,[.115,.17,.10],[x,1.06,.28],olive);
    part(this.body,[.16,.17,.16],[-.29,.79,-.01],tan);
    part(this.body,[.18,.23,.15],[.30,.82,.0],cloth);
    // Backpack anchored to the back, with shoulder straps and aerial.
    part(this.body,[.47,.52,.25],[0,1.16,-.29],olive);
    part(this.body,[.40,.17,.30],[0,1.39,-.33],tan);
    for(const x of [-.19,.19])
      part(this.body,[.055,.44,.06],[x,1.15,.17],strap);
    part(this.body,[.038,.47,.04],[.24,1.63,-.34],metal);
    part(this.body,[.23,.23,.24],[0,1.58,0],skin);
    part(this.body,[.34,.24,.35],[0,1.71,0],dark);
    part(this.body,[.42,.08,.41],[0,1.67,.04],olive);
    part(this.body,[.15,.08,.08],[0,1.61,.15],strap);
    // Arms angle toward weapon and remain anchored in the shoulders.
    for(const side of [-1,1]){
      const shoulder=new THREE.Group();
      shoulder.position.set(side*.32,1.34,0);this.body.add(shoulder);
      part(shoulder,[.22,.35,.22],[0,-.19,.02],coat);
      part(shoulder,[.18,.28,.20],[0,-.47,.16],cloth);
      part(shoulder,[.18,.12,.18],[0,-.62,.22],dark);
      shoulder.rotation.x=side===-1?-.29:-.40;
      shoulder.rotation.z=side*.10;
      this.arms.push(shoulder);
      const hip=new THREE.Group();hip.position.set(side*.155,.80,0);
      this.body.add(hip);
      part(hip,[.235,.37,.25],[0,-.20,0],cloth);
      const ankle=new THREE.Group();ankle.position.set(0,-.40,.01);hip.add(ankle);
      part(ankle,[.21,.35,.22],[0,-.17,.0],olive);
      part(ankle,[.25,.14,.37],[0,-.36,.07],dark);
      part(ankle,[.25,.07,.4],[0,-.43,.09],strap);
      this.legs.push({joint:hip,ankle});
    }
    // Long rifle carried across the body, aligned with the hands.
    const rifle=new THREE.Group();rifle.position.set(.06,1.10,.28);
    rifle.rotation.y=-.13;this.body.add(rifle);
    part(rifle,[.14,.18,.45],[0,0,.07],metal);
    part(rifle,[.18,.14,.38],[0,-.01,-.31],dark);
    part(rifle,[.08,.075,.59],[0,.05,.56],metal);
    part(rifle,[.12,.12,.16],[0,.055,.91],dark);
    part(rifle,[.12,.22,.14],[0,-.18,.17],metal);
    part(rifle,[.08,.09,.24],[0,.14,.14],strap);
    part(rifle,[.07,.22,.09],[0,-.16,.48],dark);
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.58,24),
      new THREE.MeshBasicMaterial({color:0x152019,transparent:true,
        opacity:.23,depthWrite:false}));
    this.geometry.push(this.shadow.geometry);
    this.shadow.rotation.x=-Math.PI/2;
    this.group.add(this.shadow);
    scene.add(this.group);
  }
  update(x:number,z:number,vx:number,vz:number,crouch:boolean,dt:number){
    const speed=Math.hypot(vx,vz);
    this.speedBlend=damp(this.speedBlend,Math.min(1,speed/2.6),13,dt);
    this.lowBlend=damp(this.lowBlend,crouch?1:0,10,dt);
    this.stride+=speed*dt*8.5;
    const b=this.speedBlend,low=this.lowBlend;
    for(let i=0;i<this.legs.length;i++){
      const phase=this.stride+i*Math.PI;
      const swing=Math.sin(phase)*b;
      this.legs[i].joint.rotation.x=swing*.43-.20*low;
      this.legs[i].ankle.rotation.x=-swing*.19+.56*low;
      this.legs[i].ankle.position.y=-.40+Math.max(0,-swing)*.08;
    }
    this.arms[0].rotation.x=-.29+.06*b*Math.sin(this.stride);
    this.arms[1].rotation.x=-.40-.07*b*Math.sin(this.stride);
    this.body.position.y=-.26*low+Math.abs(Math.sin(this.stride))*.023*b;
    this.body.rotation.x=.12*low-.035*b;
    this.body.rotation.z=Math.sin(this.stride)*.022*b;
    if(speed>.1){
      const heading=Math.atan2(vx,vz);
      const shortest=Math.atan2(Math.sin(heading-this.facing),Math.cos(heading-this.facing));
      this.facing+=shortest*(1-Math.exp(-11*dt));
    }
    this.group.rotation.y=this.facing;
    this.group.position.set(x,groundHeight(x,z),z);
    this.shadow.position.y=.026;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity=.21-.06*low;
  }
  dispose(scene:THREE.Scene){
    scene.remove(this.group);
    for(const g of this.geometry)g.dispose();
    for(const m of this.materials)m.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
