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
export class BreachCombatEffectsPresenter{
  private casingMesh:THREE.InstancedMesh|null=null;
  private casingIds:number[]=[];
  private casingMatrix=new THREE.Object3D();
  private discarded=new Map<number,THREE.Mesh>();
  private thrown=new Map<number,THREE.Mesh>();
  private detonations=new Map<number,THREE.Mesh>();
  private readonly frameMagazineIds=new Set<number>();
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
    magazines:this.discarded.size,grenades:this.thrown.size,
    flashes:this.detonations.size};}
  /** Resets mission-specific props without reconstructing persistent batches. */
  reset():void{
    if(this.casingMesh)this.casingMesh.count=0;
    this.casingIds.length=0;
    for(const cache of [this.discarded,this.thrown,this.detonations]){
      for(const mesh of cache.values()){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      cache.clear();
    }

    this.frameMagazineIds.clear();this.frameGrenadeIds.clear();
    this.frameFlashIds.clear();
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
      this.effects.add(this.casingMesh);
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
         s.seconds-brass.at<2){
        const p=casingAt(brass,s.seconds);
        this.casingMatrix.position.set(p.x,p.y,p.z);
        this.casingMatrix.rotation.set(.9,p.rotation,1.2);
        const factor=brass.weapon==='shotgun'?1.45:
          brass.weapon==='smg'?.73:brass.weapon==='rifle'?1.2:1;
        this.casingMatrix.scale.set(factor,factor,factor);
        this.casingMatrix.updateMatrix();
        casingDraw.setMatrixAt(casingCount,this.casingMatrix.matrix);
        casingDirty=true;
      }
      this.casingIds[casingCount++]=brass.id;
    }
    if(casingDraw.count!==casingCount)casingDirty=true;
    casingDraw.count=casingCount;
    this.casingIds.length=casingCount;
    if(casingDirty)casingDraw.instanceMatrix.needsUpdate=true;
    // Retained physical magazines, grenades in flight and expanding flashes.
    const activeMag=this.frameMagazineIds;activeMag.clear();
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
    const liveGrenades=this.frameGrenadeIds;liveGrenades.clear();
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
    const liveBursts=this.frameFlashIds;liveBursts.clear();
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
      [this.discarded,activeMag],[this.thrown,liveGrenades],
      [this.detonations,liveBursts],
    ] as [Map<number,THREE.Mesh>,Set<number>][])
      for(const [id,mesh] of cache)if(!activeIds.has(id)){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();cache.delete(id);
      }

  }
}
