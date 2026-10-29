import * as THREE from 'three';
import {FIRST_PLACE} from './first-place-layout.ts';
import {
  regionLocalHeightM,globalSouthM,regionRiverX,
  regionSlopeDegrees,type PlayableRegionId,
} from './playable-region-model.ts';

export const REGION_TILES_PER_SIDE=8;
export const REGION_TILE_SIZE_M=125;
export const REGION_COARSE_SEGMENTS=16;
export const REGION_FINE_SEGMENTS=64;
export const REGION_COARSE_STEP_M=REGION_TILE_SIZE_M/REGION_COARSE_SEGMENTS;
export type RegionTileCoord={col:number;row:number};
const clamp=(v:number,a=0,b=1)=>Math.min(b,Math.max(a,v));
function tileOrigin(tile:RegionTileCoord){
  return {x:-500+tile.col*REGION_TILE_SIZE_M,z:-500+tile.row*REGION_TILE_SIZE_M};
}
/** A single globally anchored coarse lattice is the authoritative large
 * surface. Patches interpolate it, so switching detail never alters the
 * large landform or creates cracks against adjacent coarse meshes. */
export function coarseHeightAt(id:PlayableRegionId,x:number,z:number,seed=31):number{
  const step=REGION_COARSE_STEP_M;
  const gx=clamp((x+500)/step,0,128);
  const gz=clamp((z+500)/step,0,128);
  const i=Math.min(127,Math.floor(gx)),j=Math.min(127,Math.floor(gz));
  const fx=gx-i,fz=gz-j;
  const x0=-500+i*step,z0=-500+j*step;
  const a=regionLocalHeightM(id,x0,z0,seed);
  const b=regionLocalHeightM(id,x0+step,z0,seed);
  const c=regionLocalHeightM(id,x0,z0+step,seed);
  const d=regionLocalHeightM(id,x0+step,z0+step,seed);
  return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;
}
function microDetail(x:number,z:number,seed:number):number{
  // Local relief only: no new rivers or invented large topography.
  return (.75*Math.sin(x*.29+seed)*Math.cos(z*.22-seed*.8)+
    .32*Math.sin(x*.57-z*.39))*1.2;
}
export function tileHeightAt(id:PlayableRegionId,tile:RegionTileCoord,
  x:number,z:number,fine:boolean,seed=31):number{
  const baseline=coarseHeightAt(id,x,z,seed);
  if(!fine)return baseline;
  const o=tileOrigin(tile);
  const u=clamp((x-o.x)/REGION_TILE_SIZE_M);
  const v=clamp((z-o.z)/REGION_TILE_SIZE_M);
  // Detail vanishes exactly on every patch edge, retaining the exact
  // same height as neighboring lower-resolution tiles.
  const taper=Math.sin(Math.PI*u)**2*Math.sin(Math.PI*v)**2;
  return baseline+microDetail(x,z,seed)*taper;
}
function colorAt(id:PlayableRegionId,x:number,z:number,seed:number):THREE.Color{
  const south=globalSouthM(id,z),river=regionRiverX(south,seed);
  const height=coarseHeightAt(id,x,z,seed);
  const floor=coarseHeightAt(id,river,z,seed);
  const relative=Math.max(0,height-floor);
  const slope=regionSlopeDegrees(id,x,z,seed);
  const fertile=clamp(1-relative/170);
  const stone=clamp((relative-98)/160)*.70+
    clamp((slope-29)/22)*.25;
  const bank=1-clamp((Math.abs(x-river)-15)/34);
  const brown=new THREE.Color(0x9c987d);
  const meadow=new THREE.Color(0x6f9076);
  const upland=new THREE.Color(0x8c9a87);
  const rock=new THREE.Color(0x8f948a);
  const color=brown.lerp(meadow,.32+.43*fertile)
    .lerp(upland,clamp(relative/170)*.50)
    .lerp(rock,clamp(stone));
  color.lerp(new THREE.Color(0xa2a28a),bank*.11);
  // Broad organic variance only, not individual grass or trees yet.
  const variation=.97+.035*Math.sin(x/44+z/69)*Math.sin(z/37-x/91);
  return color.multiplyScalar(variation);
}
/** 8x8 modest chunks; one may be swapped for a 2m local fine patch. */
export function makeRegionTile(id:PlayableRegionId,tile:RegionTileCoord,
  fine=false,seed=31):THREE.BufferGeometry{
  if(tile.col<0||tile.col>=8||tile.row<0||tile.row>=8)
    throw new Error('Invalid Cutwoods tile');
  const segments=fine?REGION_FINE_SEGMENTS:REGION_COARSE_SEGMENTS;
  const o=tileOrigin(tile),step=REGION_TILE_SIZE_M/segments;
  const vertices:number[]=[],colors:number[]=[],normals:number[]=[],indices:number[]=[];
  const c=new THREE.Color(),normal=new THREE.Vector3();
  for(let j=0;j<=segments;j++){
    for(let i=0;i<=segments;i++){
      const x=o.x+i*step,z=o.z+j*step;
      const y=tileHeightAt(id,tile,x,z,fine,seed);
      vertices.push(x,y,z);
      // Shared world-coordinate derivatives produce the same normals on
      // both sides of a tile edge. Per-tile computeVertexNormals() created
      // faint illuminated seams despite identical edge heights.
      const d=.10;
      const gx=(tileHeightAt(id,tile,x+d,z,fine,seed)-
        tileHeightAt(id,tile,x-d,z,fine,seed))/(2*d);
      const gz=(tileHeightAt(id,tile,x,z+d,fine,seed)-
        tileHeightAt(id,tile,x,z-d,fine,seed))/(2*d);
      normal.set(-gx,1,-gz).normalize();
      normals.push(normal.x,normal.y,normal.z);
      c.copy(colorAt(id,x,z,seed));colors.push(c.r,c.g,c.b);
    }
  }
  for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=a+1,d=a+segments+1,e=d+1;
    // Facing +Y. Geometry is static, so normal generation is cheap.
    indices.push(a,d,b,b,d,e);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  return geometry;
}
export class RegionalTerrainField{
  readonly group=new THREE.Group();
  readonly id:PlayableRegionId;
  private readonly material=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:1,metalness:0,
    side:THREE.FrontSide,
  });
  private readonly tiles:THREE.Mesh[][]=[];
  private selected=new Set<string>();
  private readonly seed:number;
  constructor(scene:THREE.Scene,id:PlayableRegionId,seed=31){
    this.id=id;this.seed=seed;
    for(let row=0;row<8;row++){
      const line:THREE.Mesh[]=[];
      for(let col=0;col<8;col++){
        const mesh=new THREE.Mesh(makeRegionTile(id,{row,col},false,seed),
          this.material);
        mesh.receiveShadow=true;
        this.group.add(mesh);line.push(mesh);
      }
      this.tiles.push(line);
    }
    scene.add(this.group);
  }
  /** One focus tile plus the four 125m tiles intersecting the authored
   * field station, but only while it is in view. 4 * 4225 vertices on a
   * modern phone is modest, and the same high-detail surface underlies
   * fences, boots, doors and drainage marks. No runtime world streaming. */
  setDetailFocus(x:number,z:number,enabled:boolean):void{
    const next=new Set<string>();
    if(enabled){
      const col=Math.max(0,Math.min(7,Math.floor((x+500)/125)));
      const row=Math.max(0,Math.min(7,Math.floor((z+500)/125)));
      next.add(row+':'+col);
      if(this.id==='cutwoods'&&
        Math.hypot(x-FIRST_PLACE.center.x,z-FIRST_PLACE.center.z)<185){
        for(const r of [4,5])for(const c of [4,5])
          next.add(r+':'+c);
      }
    }
    for(const key of this.selected){
      if(!next.has(key)){
        const [row,col]=key.split(':').map(Number);
        this.replace({row,col},false);
      }
    }
    for(const key of next){
      if(!this.selected.has(key)){
        const [row,col]=key.split(':').map(Number);
        this.replace({row,col},true);
      }
    }
    this.selected=next;
  }
  private replace(tile:RegionTileCoord,fine:boolean):void{
    const mesh=this.tiles[tile.row][tile.col];
    const next=makeRegionTile(this.id,tile,fine,this.seed);
    mesh.geometry.dispose();mesh.geometry=next;
  }
  dispose(scene:THREE.Scene):void{
    scene.remove(this.group);
    for(const line of this.tiles)for(const mesh of line){
      this.group.remove(mesh);mesh.geometry.dispose();
    }
    this.material.dispose();this.tiles.length=0;
  }
}
