import * as THREE from 'three';
import { Operator } from '../actors/operator';
import { NavigationGrid, type Obstacle, type Point2 } from '../navigation/grid';
import { terrainHeight } from '../world/ground';
import { ContactSimulation, type ContactEvent, type FighterId, type Order, visible } from './contact-simulation';

const distance=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z);
type Trace={body:THREE.Mesh;timer:number};
/** All physical combat actors live in the SAME world and navigation mesh as
 * work operators. Tactical decisions propose routes; only Operator executes. */
export class ContactDirector {
  readonly simulation:ContactSimulation;
  readonly hostiles:Record<'patrol-a'|'patrol-b',Operator>;
  readonly targets:Record<FighterId,Operator>;
  readonly indicator=new THREE.Group();
  selected:FighterId='patrol-a';
  tactical=false;
  private readonly scene:THREE.Scene;
  private readonly nav:NavigationGrid;
  private effects:Trace[]=[];
  private patrolPhase=0;
  private decision=0;
  private cycle=0;
  private openingElapsed=0;
  private warnedAt=-1;
  private readonly approachTime=5.5;
  private aimDirection:Point2|null=null;
  private patrolRoute:readonly Point2[]=[
    {x:34,z:23},{x:31,z:20},{x:29,z:18},{x:27,z:15},{x:31,z:20}
  ];
  private callback:(event:ContactEvent)=>void;
  constructor(scene:THREE.Scene,nav:NavigationGrid,obstacles:readonly Obstacle[],
    rook:Operator,mica:Operator,onEvent:(event:ContactEvent)=>void){
    this.scene=scene;this.nav=nav;this.callback=onEvent;
    this.simulation=new ContactSimulation(obstacles,e=>this.onEvent(e));
    const viable=(options:Point2[]):Point2=>options.find(p=>nav.canOccupy(p))??options[0];
    const a=viable([{x:35,z:23},{x:34,z:22},{x:33,z:20}]);
    const b=viable([{x:38,z:24},{x:37,z:21},{x:36,z:22}]);
    this.hostiles={
      'patrol-a':new Operator(scene,a,'hostile'),
      'patrol-b':new Operator(scene,b,'hostile'),
    };
    this.targets={rook,mica,...this.hostiles};
    const ring=new THREE.Mesh(new THREE.RingGeometry(.64,.76,20),
      new THREE.MeshBasicMaterial({color:0xe5c07a,transparent:true,opacity:.86,
        side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;
    this.indicator.add(ring);
    this.indicator.visible=false;
    scene.add(this.indicator);
    this.simulation.setPosition('patrol-a',a);
    this.simulation.setPosition('patrol-b',b);
  }
  private onEvent(e:ContactEvent) {
    if(e.type==='shot'){
      const shooter=this.targets[e.shot.from];
      shooter.fireImpulse();
      if(e.shot.hit&&e.shot.at)this.targets[e.shot.at].hitImpulse();
      this.createTrace(e.shot.start,e.shot.end,e.shot.blocked,e.shot.hit);
      if(e.shot.hit && e.shot.at && this.simulation.fighters[e.shot.at].hp===0){
        this.targets[e.shot.at].setIncapacitated(true);
      }
    }
    this.callback(e);
  }
  private createTrace(start:Point2,end:Point2,blocked:boolean,hit:boolean){
    const a=new THREE.Vector3(start.x,terrainHeight(start.x,start.z)+1.65,start.z);
    const b=new THREE.Vector3(end.x,terrainHeight(end.x,end.z)+(hit?1.55:blocked?1.1:.65),end.z);
    const direction=b.clone().sub(a),length=direction.length();
    if(length>.1){
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.026,.033,length,5),
        new THREE.MeshBasicMaterial({color:0xffd6a0,transparent:true,opacity:.86,depthWrite:false}));
      mesh.position.copy(a).addScaledVector(direction,.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      this.scene.add(mesh);this.effects.push({body:mesh,timer:.13});
    }
    const p=new THREE.Mesh(new THREE.IcosahedronGeometry(hit?.18:.13,0),
      new THREE.MeshBasicMaterial({color:hit?0xb54e39:0xe9c18a,transparent:true,opacity:.7}));
    p.position.copy(b);
    this.scene.add(p);this.effects.push({body:p,timer:.23});
  }
  resetEncounter() {
    this.simulation.reset();
    this.selected='patrol-a';
    this.tactical=false;this.decision=0;
    this.openingElapsed=0;this.warnedAt=-1;this.aimDirection=null;
    const positions:Record<FighterId,Point2>={
      rook:{x:10.7,z:10.15},mica:{x:8.2,z:10.8},
      'patrol-a':{x:35,z:23},'patrol-b':{x:38,z:24}
    };
    for(const id of Object.keys(this.targets) as FighterId[]){
      const actor=this.targets[id];const p=positions[id];
      const dest=this.nav.canOccupy(p)?p:actor.position;
      actor.setIncapacitated(false);actor.setCombat(null);actor.clearRoute();
      actor.group.position.set(dest.x,terrainHeight(dest.x,dest.z),dest.z);
      this.simulation.setPosition(id,dest);
    }
    this.patrolPhase=0;this.cycle=0;
  }
  revive(helper:FighterId,subject:FighterId){
    if(this.simulation.revive(helper,subject)){
      this.targets[subject].setIncapacitated(false);
      return true;
    }
    return false;
  }
  select(id:FighterId) {
    if(this.simulation.fighters[id].team!=='patrol'||this.simulation.fighters[id].hp===0)return false;
    this.selected=id;this.tactical=true;return true;
  }
  cycleTarget(){
    const alive=(['patrol-a','patrol-b'] as FighterId[])
      .filter(id=>this.simulation.fighters[id].hp>0);
    if(!alive.length)return;
    this.selected=alive[(alive.indexOf(this.selected)+1)%alive.length];
    this.tactical=true;
  }
  setOrder(order:Order){this.simulation.order=order;this.tactical=true;}
  setAim(direction:Point2|null) {
    const length=direction?Math.hypot(direction.x,direction.z):0;
    this.aimDirection=direction&&length>.15?
      {x:direction.x/length,z:direction.z/length}:null;
    if(this.aimDirection)this.tactical=true;
  }
  fire(){
    if(!this.aimDirection)return null;
    return this.simulation.fireDirection('rook',this.aimDirection);
  }
  reload(){this.tactical=true;return this.simulation.reload('rook');}
  get danger(){
    if(!this.simulation.patrolAlive||!this.simulation.crewAlive)return false;
    return (['patrol-a','patrol-b'] as const).some(id=>{
      const f=this.simulation.fighters[id];
      return f.hp>0 && (f.state==='engaged'||f.state==='suspicious'||
        (f.state==='searching'&&f.searchTimer>0));
    });
  }
  get showControls(){return this.tactical||this.danger;}
  /** Hit actual procedural body meshes, not a gigantic invisible click surface. */
  pick(x:number,y:number,camera:THREE.Camera,canvas:HTMLCanvasElement):FighterId|null{
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    const point=new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(point,camera);
    let best:FighterId|null=null,range=Infinity;
    for(const id of ['patrol-a','patrol-b'] as const){
      if(this.simulation.fighters[id].hp===0)continue;
      const hit=ray.intersectObject(this.hostiles[id].group,true)[0];
      if(hit&&hit.distance<range){best=id;range=hit.distance;}
    }
    return best;
  }
  /** Cover selection samples positions physically reachable around existing
   * walls. Low-cover-free locations are NOT treated as cover. */
  private coverSpot(here:Point2,threat:Point2):Point2|null{
    const options:Point2[]=[];
    for(let r=2;r<=7;r+=1.7)for(let a=0;a<16;a++){
      const angle=a*Math.PI/8;
      const p={x:here.x+Math.cos(angle)*r,z:here.z+Math.sin(angle)*r};
      if(!this.nav.canOccupy(p))continue;
      if(visible(p,threat,this.simulation.obstacles))continue;
      options.push(p);
    }
    options.sort((a,b)=>distance(a,here)-distance(b,here));
    return options.find(p=>this.nav.findPath(here,p).length>0)??null;
  }
  private go(actor:Operator,target:Point2){
    if(distance(actor.position,target)<.9){actor.clearRoute();return;}
    const path=this.nav.findPath(actor.position,target);
    if(path.length)actor.follow(path);
  }
  private synchronize(){
    for(const id of Object.keys(this.targets) as FighterId[]){
      const operator=this.targets[id];
      this.simulation.setPosition(id,operator.position,operator.group.rotation.y,operator.moving);
    }
  }
  update(dt:number,rook:Operator,mica:Operator){
    this.synchronize();
    this.openingElapsed+=dt;
    const fighters=this.simulation.fighters;
    // Patrol begins beyond immediate gunfire distance and approaches in
    // the world. Warn before awareness becomes an exchange of bullets.
    const proximity=Math.min(...(['patrol-a','patrol-b'] as const).map(id=>
      Math.min(distance(fighters[id].position,rook.position),
        distance(fighters[id].position,mica.position))));
    if(this.warnedAt<0&&this.openingElapsed>2.3&&proximity<34){
      this.warnedAt=this.openingElapsed;
      this.callback({type:'warning'});
    }
    this.simulation.update(dt);
    for(const id of Object.keys(this.targets) as FighterId[]){
      this.targets[id].setStress(fighters[id].suppressed);
    }
    if(this.aimDirection&&fighters.rook.hp>0)
      rook.setCombat({x:rook.position.x+this.aimDirection.x*8,
        z:rook.position.z+this.aimDirection.z*8});
    else rook.setCombat(null);
    this.decision-=dt;
    const decisionTick=this.decision<=0;
    if(decisionTick){
      this.decision=.9;
      this.cycle++;
      for(const id of ['patrol-a','patrol-b'] as const){
        const hostile=this.hostiles[id],f=fighters[id];
        if(f.hp===0)continue;
        const engaged=f.state==='engaged'||f.state==='suspicious';
        if(!engaged&&f.state!=='searching'){
          this.patrolPhase=(this.patrolPhase+ (id==='patrol-a'?.20:.12))%this.patrolRoute.length;
          const goal=this.patrolRoute[(Math.floor(this.patrolPhase)+(id==='patrol-b'?2:0))%this.patrolRoute.length];
          if(this.nav.canOccupy(goal))this.go(hostile,goal);
        } else if(f.lastKnown){
          const enemy=this.simulation.nearestEnemy(id);
          const enemyPos=enemy?fighters[enemy].position:f.lastKnown;
          const wounded=f.hp<45;
          const dist=distance(f.position,enemyPos);
          if(wounded||f.suppressed>.52){
            const cover=this.coverSpot(f.position,enemyPos);
            if(cover)this.go(hostile,cover);
          }else if(dist>15||!visible(f.position,enemyPos,this.simulation.obstacles)){
            this.go(hostile,f.lastKnown);
          } else hostile.clearRoute();
        }
      }
      if(this.danger){
        const enemy=this.simulation.nearestEnemy('mica');
        if(enemy&&fighters.mica.hp>0){
          const threat=fighters[enemy].position;
          const here=mica.position;
          const order=this.simulation.order;
          if(order==='withdraw'){
            const retreat={x:8.2,z:10.8};
            if(this.nav.canOccupy(retreat))this.go(mica,retreat);
          } else if(order==='hold')mica.clearRoute();
          else if(order==='cover'){
            const cover=this.coverSpot(here,threat);
            if(cover)this.go(mica,cover);
          } else if(distance(here,rook.position)>3.8) {
            const offset={x:rook.position.x-1.6,z:rook.position.z+.9};
            if(this.nav.canOccupy(offset))this.go(mica,offset);
          }
        }
      }
    }
    for(const id of ['patrol-a','patrol-b'] as const){
      const actor=this.hostiles[id],f=fighters[id];
      if(f.hp===0){actor.setIncapacitated(true);actor.setCombat(null);}
      else {
        const idTarget=this.simulation.nearestEnemy(id);
        const enemy=idTarget?fighters[idTarget]:null;
        actor.setCombat(f.state==='engaged'&&enemy?.hp?enemy.position:null);
        // A visible approach and reaction window before the first shot.
        // Never fire automatically every animation frame.
        if(f.state==='engaged'&&enemy&&decisionTick&&this.cycle%2===0 &&
          this.warnedAt>=0 &&
          this.openingElapsed-this.warnedAt>this.approachTime &&
          distance(f.position,enemy.position)<17 &&
          visible(f.position,enemy.position,this.simulation.obstacles)){
          if(f.ammo===0)this.simulation.reload(id);
          else this.simulation.fire(id,idTarget!);
        }
      }
      actor.setDrive(null);
      actor.update(dt,this.nav);
    }
    if(this.danger){
      const foe=this.simulation.nearestEnemy('mica');
      mica.setCombat(foe?fighters[foe].position:null);
      mica.setDrive(null);
      mica.update(dt,this.nav);
      if(foe&&fighters.mica.hp>0&&distance(mica.position,fighters[foe].position)<23&&
        visible(mica.position,fighters[foe].position,this.simulation.obstacles)){
        if(fighters.mica.ammo===0)this.simulation.reload('mica');
        else if(decisionTick&&this.cycle%2===0)this.simulation.fire('mica',foe);
      }
    }else mica.setCombat(null);
    // The ring is a ground-anchored aim point, never an enemy lock.
    this.indicator.visible=this.aimDirection!==null&&fighters.rook.hp>0;
    if(this.indicator.visible&&this.aimDirection){
      const p=rook.position;
      const x=p.x+this.aimDirection.x*7;
      const z=p.z+this.aimDirection.z*7;
      this.indicator.position.set(x,terrainHeight(x,z)+.12,z);
      this.indicator.rotation.y+=dt*.8;
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.timer-=dt;
      const material=e.body.material as THREE.MeshBasicMaterial;
      material.opacity=Math.max(0,e.timer/.24)*.85;
      if(e.timer<=0){
        this.scene.remove(e.body);e.body.geometry.dispose();material.dispose();
        this.effects.splice(i,1);
      }
    }
  }
}
