import * as THREE from 'three';
import { CELL_SIZE, terrainHeight } from './terrain-model';
import { surfaceAt } from './surface-materials';
import { evaluateTraffic, slopeAt, type TrafficKind, type GroundLoad } from './traffic-model';
import type { TerrainWater } from './hydrology';

/**
 * Build 016 dev-only visual inspection. One translucent 32x32 mobility
 * overlay + a single merged rut mesh. Both follow the existing land surface
 * WITHOUT changing its real elevation or the hydrology catchments.
 */
export class TrafficField {
  private readonly overlay:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly ruts:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly cursor:THREE.Mesh;
  private readonly cursorMaterial:THREE.MeshBasicMaterial;
  private readonly palette={
    firm:new THREE.Color(0x789c7a),
    slow:new THREE.Color(0xc2ae68),
    difficult:new THREE.Color(0xc27a54),
    blocked:new THREE.Color(0xa65046),
  };
  private selected:number|null=null;
  private shown=false;
  private lastRutRevision=-1;
  private lastHour=-99;
  private lastKind:TrafficKind='foot';

  constructor(scene:THREE.Scene,water:TerrainWater){
    const positions:number[]=[];
    const colors:number[]=[];
    for(const cell of water.watershed.cells){
      const x=cell.x-CELL_SIZE*.5,z=cell.z-CELL_SIZE*.5;
      const tl=[x,z],tr=[x+CELL_SIZE,z],br=[x+CELL_SIZE,z+CELL_SIZE],bl=[x,z+CELL_SIZE];
      const cc=[cell.x,cell.z];
      for(const tri of [[tl,cc,tr],[tr,cc,br],[br,cc,bl],[bl,cc,tl]]){
        for(const point of tri){
          positions.push(point[0],terrainHeight(point[0],point[1])+.014,point[1]);
          colors.push(.3,.5,.3);
        }
      }
    }
    const overlayGeometry=new THREE.BufferGeometry();
    overlayGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    overlayGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    this.overlay=new THREE.Mesh(overlayGeometry,new THREE.MeshBasicMaterial({
      vertexColors:true,transparent:true,opacity:.29,
      depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      polygonOffset:true,polygonOffsetFactor:-2,
    }));
    this.overlay.renderOrder=1.2;
    this.overlay.visible=false;
    this.overlay.frustumCulled=false;
    scene.add(this.overlay);

    this.ruts=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
      vertexColors:true,transparent:true,opacity:.82,
      depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      polygonOffset:true,polygonOffsetFactor:-3,
    }));
    this.ruts.renderOrder=1.4;
    this.ruts.frustumCulled=false;
    scene.add(this.ruts);

    this.cursorMaterial=new THREE.MeshBasicMaterial({
      color:0xf5c879,transparent:true,opacity:.92,
      depthWrite:false,depthTest:true,side:THREE.DoubleSide,
    });
    this.cursor=new THREE.Mesh(new THREE.RingGeometry(.12,.15,24),this.cursorMaterial);
    this.cursor.rotation.x=-Math.PI/2;
    this.cursor.renderOrder=1.65;
    this.cursor.visible=false;
    scene.add(this.cursor);
  }

  setInspection(on:boolean):void{
    this.shown=on;
    this.overlay.visible=on;
    this.cursor.visible=on && this.selected!==null;
  }
  select(index:number,water:TerrainWater):void{
    this.selected=index;
    const cell=water.watershed.cells[index];
    if(!cell)return;
    this.cursor.position.set(cell.x,terrainHeight(cell.x,cell.z)+.026,cell.z);
    this.cursor.visible=this.shown;
  }

  update(water:TerrainWater,load:GroundLoad,hour:number,kind:TrafficKind,force=false):void{
    const revision=load.getRevision();
    if(revision!==this.lastRutRevision){
      this.rebuildRuts(water,load);
      this.lastRutRevision=revision;
    }
    if(!this.shown)return;
    if(!force && kind===this.lastKind && Math.abs(hour-this.lastHour)<.16)return;
    this.lastKind=kind;
    this.lastHour=hour;
    const attribute=this.overlay.geometry.getAttribute('color') as THREE.BufferAttribute;
    const levels=water.watershed.basins.map(b=>water.surfaceLevel(b.id));
    for(const cell of water.watershed.cells){
      const basin=water.watershed.cellBasin[cell.index];
      const depth=basin<0||levels[basin]===null?0:Math.max(0,levels[basin]!-cell.height);
      const result=evaluateTraffic(
        surfaceAt(cell.x,cell.z).kind,
        water.soilFraction(cell.index),depth,
        slopeAt(cell.x,cell.z),load.rutDepths[cell.index],kind,
      );
      const color=this.palette[result.condition];
      const base=cell.index*12;
      for(let vertex=0;vertex<12;vertex++){
        attribute.setXYZ(base+vertex,color.r,color.g,color.b);
      }
    }
    attribute.needsUpdate=true;
  }

  private rebuildRuts(water:TerrainWater,load:GroundLoad):void{
    const positions:number[]=[];
    const colors:number[]=[];
    const addStrip=(x:number,z:number,angle:number,side:number,depth:number,foot:boolean)=>{
      // Two parallel shallow marks represent vehicle tire ruts.
      // One shorter/central depression represents a foot impression.
      const length=foot?.085:CELL_SIZE*.93;
      const width=foot?.043:.044;
      const offset=foot?0:side*.103;
      const dx=Math.cos(angle),dz=Math.sin(angle);
      const nx=-dz,nz=dx;
      const cx=x+nx*offset,cz=z+nz*offset;
      const points=[
        [cx-dx*length*.5-nx*width*.5,cz-dz*length*.5-nz*width*.5],
        [cx+dx*length*.5-nx*width*.5,cz+dz*length*.5-nz*width*.5],
        [cx+dx*length*.5+nx*width*.5,cz+dz*length*.5+nz*width*.5],
        [cx-dx*length*.5+nx*width*.5,cz-dz*length*.5+nz*width*.5],
      ];
      const brown=new THREE.Color(0x3a3227).lerp(new THREE.Color(0x75654d),1-depth/.075);
      for(const i of [0,1,2,0,2,3]){
        const p=points[i];
        positions.push(p[0],terrainHeight(p[0],p[1])+.019,p[1]);
        colors.push(brown.r,brown.g,brown.b);
      }
    };
    for(const cell of water.watershed.cells){
      const depth=load.rutDepths[cell.index];
      if(depth<.0014)continue;
      // Severity differentiates light foot traffic from heavy-wheel ruts.
      const foot=depth<.007;
      const angle=load.rutAngles[cell.index];
      if(foot)addStrip(cell.x,cell.z,angle,0,depth,true);
      else{
        addStrip(cell.x,cell.z,angle,-1,depth,false);
        addStrip(cell.x,cell.z,angle,1,depth,false);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    this.ruts.geometry.dispose();
    this.ruts.geometry=geometry;
    this.ruts.visible=positions.length>0;
  }
}
