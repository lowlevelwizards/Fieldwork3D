/** Scene-owned transient combat-effects presentation.
 * Keeps authoritative projectile physics, impact evidence and observer
 * knowledge external. Pooled material/geometry lifetimes match the scene.
 */
import * as THREE from 'three';
import type {Session} from '../breach-game.ts';
import type {Pt} from '../breach-core.ts';
import {casingAt,CASING_LIMIT} from '../breach-effects.ts';
import {sampleThrow} from '../breach-flash.ts';
import {enableWorldGraphicMaterial} from '../breach-graphic-world-lighting.ts';
import {ShotVisualPool} from './breach-shot-visual-pool.ts';
import {presentTransientEvidence} from './breach-3d-disclosure-presenter.ts';
/** Retain at most this many dropped-magazine visual meshes. The physical
 * inventory, evidence and replay history remain unmodified. */
export const MAX_DROPPED_MAGAZINE_VISUALS=64;
export const MAX_TRANSIENT_EFFECT_SPARES=32;
type MagazineSlot={id:number;x:number;y:number;t:number};
export class BreachCombatEffectsPresenter{
  private lastCasingTime=-Infinity;
  private magazineMesh:THREE.InstancedMesh|null=null;
  private readonly magazineMatrix=new THREE.Object3D();
  private readonly magazineSlots:MagazineSlot[]=[];
  private grenadeGeometry:THREE.IcosahedronGeometry|null=null;
  private grenadeMaterial:THREE.MeshStandardMaterial|null=null;
  private flashGeometry:THREE.SphereGeometry|null=null;
  private readonly pool=new ShotVisualPool<THREE.Mesh>(MAX_TRANSIENT_EFFECT_SPARES);
  private geometryCreates=0;
  private materialCreates=0;
  private meshCreates=0;
  private matrixWrites=0;
  private casingMesh:THREE.InstancedMesh|null=null;
  private casingIds:number[]=[];
  private casingMatrix=new THREE.Object3D();
  private thrown=new Map<number,THREE.Mesh>();
  private detonations=new Map<number,THREE.Mesh>();
  private readonly frameGrenadeIds=new Set<number>();
  private readonly frameFlashIds=new Set<number>();
  private readonly effects:THREE.Group;
  private readonly mats:THREE.Material[];
  private readonly graphicLookEnabled:boolean;
  constructor(effects:THREE.Group,mats:THREE.Material[],
    graphicLookEnabled:boolean){
    this.effects=effects;this.mats=mats;
    this.graphicLookEnabled=graphicLookEnabled;
  }
  stats(){return {casings:this.casingMesh?.count??0,
    magazines:this.magazineMesh?.count??0,grenades:this.thrown.size,
    flashes:this.detonations.size};}
  /** Cumulative presenter resource counters; not GPU timings. */
  resourceStats(){return {geometryCreates:this.geometryCreates,
    materialCreates:this.materialCreates,meshCreates:this.meshCreates,
    matrixWrites:this.matrixWrites,spares:this.pool.spareCount};}
  private retire(cache:Map<number,THREE.Mesh>,active:Set<number>,style:string):void{
    for(const [id,mesh] of cache)if(!active.has(id)){
      this.effects.remove(mesh);mesh.visible=false;
      this.pool.release(style,mesh,discard=>{
        if(style==='flash')(discard.material as THREE.Material).dispose();
      });
      cache.delete(id);
    }
  }
  /** Mission reset retains bounded, scene-owned resources, never visible evidence. */
  reset():void{
    if(this.casingMesh)this.casingMesh.count=0;
    this.casingIds.length=0;this.lastCasingTime=-Infinity;
    if(this.magazineMesh){
      this.magazineMesh.count=0;this.effects.remove(this.magazineMesh);
    }
    this.magazineSlots.length=0;
    this.frameGrenadeIds.clear();this.frameFlashIds.clear();
    this.retire(this.thrown,this.frameGrenadeIds,'grenade');
    this.retire(this.detonations,this.frameFlashIds,'flash');
  }
  private makeMagazineBatch():THREE.InstancedMesh{
    const mat=new THREE.MeshStandardMaterial({color:0x313b37,roughness:.75});
    this.materialCreates++;this.geometryCreates++;
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(6,1.5,3),
      mat,MAX_DROPPED_MAGAZINE_VISUALS);
    mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }
  private updateMagazines(s:Session,omniscient:boolean,personal:boolean,
    visibleAt:(p:Pt)=>boolean):void{
    let count=0,dirty=false;
    for(let i=Math.max(0,s.dropped.length-MAX_DROPPED_MAGAZINE_VISUALS);
      i<s.dropped.length;i++){
      const mag=s.dropped[i];
      if(!presentTransientEvidence(mag.p,omniscient,personal,visibleAt))continue;
      const mesh=this.magazineMesh??(this.magazineMesh=this.makeMagazineBatch());
      const t=Math.min(1.5,mag.age),slot=this.magazineSlots[count];
      if(!slot||slot.id!==mag.id||slot.x!==mag.p.x||slot.y!==mag.p.y||slot.t!==t){
        const m=this.magazineMatrix;
        m.position.set(mag.p.x+Math.sin(mag.id)*t*3.5,
          Math.max(1.1,7+10*t-27*t*t),mag.p.y+Math.cos(mag.id)*t*2.7);
        m.rotation.set(.2*Math.min(1,t*8),mag.id*2.13,
          Math.min(1,t*4)*Math.PI*.40);
        m.updateMatrix();mesh.setMatrixAt(count,m.matrix);
        if(slot){slot.id=mag.id;slot.x=mag.p.x;slot.y=mag.p.y;slot.t=t;}
        else this.magazineSlots[count]={id:mag.id,x:mag.p.x,y:mag.p.y,t};
        dirty=true;this.matrixWrites++;
      }
      count++;
    }
    const mesh=this.magazineMesh;
    if(!mesh)return;
    if(mesh.count!==count)dirty=true;
    mesh.count=count;this.magazineSlots.length=count;
    if(dirty)mesh.instanceMatrix.needsUpdate=true;
    if(count&&mesh.parent!==this.effects)this.effects.add(mesh);
    else if(!count&&mesh.parent===this.effects)this.effects.remove(mesh);
  }
  private createGrenade():THREE.Mesh{
    if(!this.grenadeGeometry){
      this.grenadeGeometry=new THREE.IcosahedronGeometry(2.7,0);this.geometryCreates++;
    }
    if(!this.grenadeMaterial){
      this.grenadeMaterial=new THREE.MeshStandardMaterial({color:0x879184,roughness:.75});
      this.materialCreates++;
    }
    this.meshCreates++;
    return new THREE.Mesh(this.grenadeGeometry,this.grenadeMaterial);
  }
  private createFlash():THREE.Mesh{
    if(!this.flashGeometry){
      this.flashGeometry=new THREE.SphereGeometry(1,12,8);this.geometryCreates++;
    }
    this.meshCreates++;this.materialCreates++;
    return new THREE.Mesh(this.flashGeometry,
      new THREE.MeshBasicMaterial({color:0xfff1c7,transparent:true,
        opacity:.8,depthWrite:false}));
  }
  update(s:Session,omniscient:boolean,personal:boolean,
    visibleAt:(p:Pt)=>boolean):void{
    const replayDisclosurePolicy=personal?{mode:'operator'}:null;
    const liveVisibility=(_session:Session,p:Pt)=>visibleAt(p);
    if(!this.casingMesh){
      // One scene-lit brass material keeps the pooled instancing and zero
      // casing shadows. Deeper copper/gold, rather than flat yellow paint.
      // The graphic world's three-band lighting can shade it at no extra draw.
      const brass=new THREE.MeshStandardMaterial({
        color:0xb38d59,roughness:.48,metalness:.52,flatShading:true});
      if(this.graphicLookEnabled)enableWorldGraphicMaterial(brass);
      this.mats.push(brass);
      this.casingMesh=new THREE.InstancedMesh(
        new THREE.CylinderGeometry(.75,.75,3.1,6),brass,CASING_LIMIT);
      this.casingMesh.castShadow=false;
      this.casingMesh.receiveShadow=false;
      this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.casingMesh.frustumCulled=false;
      this.effects.add(this.casingMesh);this.geometryCreates++;this.materialCreates++;
    }
    const casingDraw=this.casingMesh;
    let casingCount=0,casingDirty=false;
    for(const brass of s.casings){
      // Casing positions could reveal a shooter who was never confirmed
      // by the selected observer. Contact review has no shot forensics.
      if(replayDisclosurePolicy?.mode==='operator')continue;
      if(!omniscient&&!liveVisibility(s,{x:brass.x,y:brass.z}))continue;
      if(casingCount>=CASING_LIMIT)break;
      // Full ballistic + bounce motion ends comfortably before two seconds.
      // Settled cartridges retain their previous instance matrices.
      if(this.casingIds[casingCount]!==brass.id||
         s.seconds<this.lastCasingTime||
         (s.seconds!==this.lastCasingTime&&this.lastCasingTime-brass.at<2)){
        const p=casingAt(brass,s.seconds);
        this.casingMatrix.position.set(p.x,p.y,p.z);
        this.casingMatrix.rotation.set(.9,p.rotation,1.2);
        const factor=brass.weapon==='shotgun'?1.45:
          brass.weapon==='smg'?.73:brass.weapon==='rifle'?1.2:1;
        this.casingMatrix.scale.set(factor,factor,factor);
        this.casingMatrix.updateMatrix();
        casingDraw.setMatrixAt(casingCount,this.casingMatrix.matrix);
        casingDirty=true;this.matrixWrites++;
      }
      this.casingIds[casingCount++]=brass.id;
    }
    if(casingDraw.count!==casingCount)casingDirty=true;
    casingDraw.count=casingCount;
    this.casingIds.length=casingCount;
    if(casingDirty)casingDraw.instanceMatrix.needsUpdate=true;
    this.lastCasingTime=s.seconds;
    this.updateMagazines(s,omniscient,personal,visibleAt);
    const liveGrenades=this.frameGrenadeIds;liveGrenades.clear();
    for(const grenade of s.grenades)liveGrenades.add(grenade.id);
    this.retire(this.thrown,liveGrenades,'grenade');
    for(const grenade of s.grenades){
      const visible=presentTransientEvidence(grenade.p,omniscient,personal,visibleAt);
      let mesh=this.thrown.get(grenade.id);
      if(!visible&&!mesh)continue;
      if(!mesh){
        mesh=this.pool.acquire('grenade',()=>this.createGrenade());
        this.thrown.set(grenade.id,mesh);this.effects.add(mesh);
      }
      mesh.visible=visible;
      if(!visible)continue;
      const t=Math.min(1,grenade.age/.55);
      const path=grenade.path?sampleThrow(grenade.path,t):null;
      mesh.position.set(grenade.p.x,path?.height??(1+20*4*t*(1-t)),
        grenade.p.y);
    }
    const liveBursts=this.frameFlashIds;liveBursts.clear();
    for(const burst of s.flashBursts)liveBursts.add(burst.id);
    this.retire(this.detonations,liveBursts,'flash');
    for(const burst of s.flashBursts){
      const visible=presentTransientEvidence(burst.p,omniscient,personal,visibleAt);
      let mesh=this.detonations.get(burst.id);
      if(!visible&&!mesh)continue;
      if(!mesh){
        mesh=this.pool.acquire('flash',()=>this.createFlash());
        this.detonations.set(burst.id,mesh);this.effects.add(mesh);
      }
      mesh.visible=visible;
      if(!visible)continue;
      mesh.position.set(burst.p.x,13,burst.p.y);
      mesh.scale.setScalar(5+70*burst.age);
      (mesh.material as THREE.MeshBasicMaterial).opacity=
        Math.max(0,.78*(1-burst.age/.7));
    }
  }
}
