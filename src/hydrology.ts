/**
 * Ground Zero Builds 009 / 010: terrain-directed catchments, pond levels,
 * and volume-conserving overflow. Adapted in principle from LLW browser's
 * downhill/catchment/minimax-escape/volume-at-level approach.
 *
 * Unlike LLW's one-shot normalized runoff, this is incremental litres.
 * Atoms 011-014 add per-cell soil storage, rate-limited infiltration,
 * real evaporation, wind, and surface material differences.
 * No groundwater movement or fluid momentum.
 */
import {
  CELL_AREA, cellIndexAt, isEdgeCell,
  makeTerrainCells, type TerrainCell,
} from './terrain-model.ts';
import { CLOUD_COUNT, cloudAt, cloudCoverAtHour, cloudPresence } from './cloud-model.ts';
import { rainIntensityAtHour } from './rain-model.ts';
import { wrapHour } from './environment-conditions.ts';
import { evaporationMmPerHour } from './evaporation-model.ts';
import {
  infiltrationBudgetLiters, soilCapacityLiters, surfaceAt,
} from './surface-materials.ts';

export const PEAK_RAIN_MM_PER_HOUR = 28;
const EPS = 1e-8;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type DrainageBasin = {
  id: number;
  sinkIndex: number;
  cellIndexes: number[];
  spillLevel: number;
  outletId: number; // -1 = outside the region
  capacityLiters: number;
  routeDepth: number;
};

export type Watershed = {
  cells: TerrainCell[];
  downhill: number[];
  cellBasin: number[];
  basins: DrainageBasin[];
};

function addEdge(graph: Map<number, Map<number, number>>, a: number, b: number, saddle: number) {
  if (a === b) return;
  const edges = graph.get(a) ?? new Map<number, number>();
  const old = edges.get(b);
  if (old === undefined || saddle < old) edges.set(b, saddle);
  graph.set(a, edges);
}

/**
 * Find a strictly downhill route to a sink; border sinks drain OUTSIDE.
 * At a basin boundary the lowest saddle determines its eventual overflow.
 */
export function buildWatershed(cells: TerrainCell[] = makeTerrainCells()): Watershed {
  const count = cells.length;
  const downhill = Array<number>(count).fill(-1);
  for (const cell of cells) {
    let best = -1;
    let lowest = cell.height;
    for (const index of cell.neighbors) {
      const neighbor = cells[index];
      if (neighbor.height < lowest - EPS ||
        (neighbor.height < cell.height - EPS &&
         Math.abs(neighbor.height - lowest) <= EPS && (best < 0 || index < best))) {
        best = index;
        lowest = neighbor.height;
      }
    }
    downhill[cell.index] = best;
  }

  const sinks = cells.filter(c => downhill[c.index] < 0 && !isEdgeCell(c.index));
  const basinBySink = new Map(sinks.map((s,i)=>[s.index,i]));
  const cellBasin = Array<number>(count).fill(-2);
  const follow = (start: number): number => {
    if (cellBasin[start] !== -2) return cellBasin[start];
    const path: number[] = [];
    let at=start;
    while (cellBasin[at] === -2 && downhill[at] >= 0) {
      path.push(at);
      at=downhill[at];
    }
    const basin = cellBasin[at] === -2
      ? (basinBySink.get(at) ?? -1)
      : cellBasin[at];
    cellBasin[at]=basin;
    for (const index of path) cellBasin[index]=basin;
    return basin;
  };
  for(let index=0;index<count;index++)follow(index);

  const basins: DrainageBasin[] = sinks.map((sink,id)=>({
    id, sinkIndex:sink.index, cellIndexes:[], spillLevel:Infinity,
    outletId:-1, capacityLiters:0, routeDepth:0,
  }));
  for(const cell of cells){
    const id=cellBasin[cell.index];
    if(id>=0)basins[id].cellIndexes.push(cell.index);
  }

  // Catchment boundary graph: minimum saddle for each pair of drainage areas.
  // Outside (-1) is a real boundary drain, never an artificial lake.
  const adjacency = new Map<number, Map<number, number>>();
  for(const cell of cells){
    const basin=cellBasin[cell.index];
    if(isEdgeCell(cell.index) && basin>=0) {
      addEdge(adjacency,basin,-1,cell.height);
      addEdge(adjacency,-1,basin,cell.height);
    }
    for(const neighborIndex of cell.neighbors){
      const other=cellBasin[neighborIndex];
      if(basin===other)continue;
      const saddle=Math.max(cell.height,cells[neighborIndex].height);
      addEdge(adjacency,basin,other,saddle);
      addEdge(adjacency,other,basin,saddle);
    }
  }

  // Minimax escape search from the outside. The cost of a path is its
  // highest saddle, rather than the sum of elevations.
  const distance = Array<number>(basins.length).fill(Infinity);
  const parent = Array<number>(basins.length).fill(-1);
  const visited = Array<boolean>(basins.length).fill(false);
  for(const [id,saddle] of adjacency.get(-1) ?? []){
    if(id<0)continue;
    distance[id]=saddle;
    parent[id]=-1;
  }
  for(let step=0;step<basins.length;step++){
    let current=-1;
    for(let i=0;i<basins.length;i++){
      if(visited[i])continue;
      if(current<0 || distance[i]<distance[current]-EPS ||
        (Math.abs(distance[i]-distance[current])<=EPS && i<current)){
        current=i;
      }
    }
    if(current<0 || !Number.isFinite(distance[current]))break;
    visited[current]=true;
    for(const [next,saddle] of adjacency.get(current) ?? []){
      if(next<0 || visited[next])continue;
      const candidate=Math.max(distance[current],saddle);
      if(candidate < distance[next]-EPS){
        distance[next]=candidate;
        parent[next]=current;
      }
    }
  }

  for(const basin of basins){
    // Terrain borders ALWAYS provide an escape path.
    basin.spillLevel=Number.isFinite(distance[basin.id])
      ? Math.max(cells[basin.sinkIndex].height,distance[basin.id])
      : cells[basin.sinkIndex].height;
    basin.outletId=parent[basin.id];
    basin.capacityLiters=basin.cellIndexes.reduce((sum,index)=>
      sum + Math.max(0,basin.spillLevel-cells[index].height)*CELL_AREA*1000,0);
    const seen=new Set<number>();
    let downstream=basin.outletId;
    while(downstream>=0){
      if(seen.has(downstream))throw Error('Water routing cycle');
      seen.add(downstream);
      downstream=parent[downstream];
    }
    basin.routeDepth=seen.size;
  }
  return {cells,downhill,cellBasin,basins};
}

/** At a single level, connected basin cells below it can contain this volume. */
export function volumeAtLevel(
  watershed: Watershed, basin: DrainageBasin, surface: number,
): number {
  let sum=0;
  for(const index of basin.cellIndexes){
    sum+=Math.max(0,surface-watershed.cells[index].height)*CELL_AREA*1000;
  }
  return sum;
}

export function solveWaterLevel(
  watershed: Watershed, basin: DrainageBasin, litres: number,
): number | null {
  if (litres <= EPS || basin.capacityLiters <= EPS) return null;
  const floor=watershed.cells[basin.sinkIndex].height;
  if (litres>=basin.capacityLiters-EPS) return basin.spillLevel;
  let lower=floor,upper=basin.spillLevel;
  for(let i=0;i<27;i++){
    const middle=(lower+upper)*.5;
    if(volumeAtLevel(watershed,basin,middle)<litres)lower=middle;
    else upper=middle;
  }
  return (lower+upper)*.5;
}

type ActiveCloud = { x:number;z:number;rx:number;rz:number;presence:number };
function visibleClouds(hour:number,cover:number): ActiveCloud[] {
  const clouds: ActiveCloud[]=[];
  for(let index=0;index<CLOUD_COUNT;index++){
    const cloud=cloudAt(index,hour);
    const presence=cloudPresence(cover,cloud.rank);
    if(presence<=.0001)continue;
    // Same local rainfall footprint used by Build 007, no made-up basins.
    clouds.push({
      x:cloud.x,z:cloud.z,rx:2*cloud.scale,rz:1.65*cloud.scale,presence,
    });
  }
  return clouds;
}
function cloudExposure(cell:TerrainCell, clouds:ActiveCloud[]):number {
  let exposure=0;
  for(const c of clouds){
    const dx=(cell.x-c.x)/c.rx;
    const dz=(cell.z-c.z)/c.rz;
    const distance=dx*dx+dz*dz;
    if(distance<1)exposure+=(1-distance)*c.presence;
  }
  return clamp01(exposure);
}

export type WaterState = {
  basins: {sinkIndex:number;litres:number}[];
  exportedLiters:number;
  totalDepositedLiters:number;
  // Optional for compatibility with Build 010 saves.
  soilLiters?:number[];
  evaporatedLiters?:number;
};

export class TerrainWater {
  readonly watershed: Watershed;
  private readonly water: number[];
  private exported=0;
  private deposited=0;
  private evaporated=0;
  private readonly soil:number[];
  private readonly soilCaps:number[];

  constructor(watershed: Watershed = buildWatershed(), saved?: unknown) {
    this.watershed=watershed;
    this.water=watershed.basins.map(()=>0);
    this.soil=watershed.cells.map(()=>0);
    this.soilCaps=watershed.cells.map(c=>soilCapacityLiters(c.x,c.z));
    if(saved && typeof saved==='object'){
      const record=saved as Partial<WaterState>;
      if(Array.isArray(record.basins)){
        const bySink=new Map(record.basins
          .filter(b=>b && Number.isInteger(b.sinkIndex) && typeof b.litres==='number' &&
              Number.isFinite(b.litres) && b.litres>=0 && b.litres < 1e8)
          .map(b=>[b.sinkIndex,b.litres]));
        for(const basin of watershed.basins) this.water[basin.id]=bySink.get(basin.sinkIndex) ?? 0;
      }
      if(typeof record.exportedLiters==='number' && Number.isFinite(record.exportedLiters)){
        this.exported=Math.max(0,record.exportedLiters);
      }
      if(typeof record.totalDepositedLiters==='number' && Number.isFinite(record.totalDepositedLiters)){
        this.deposited=Math.max(0,record.totalDepositedLiters);
      }
      if(Array.isArray(record.soilLiters) && record.soilLiters.length===this.soil.length) {
        for(let i=0;i<this.soil.length;i++){
          const raw=record.soilLiters[i];
          if(typeof raw==='number'&&Number.isFinite(raw)&&raw>=0){
            this.soil[i]=Math.min(raw,this.soilCaps[i]);
          }
        }
      }
      if(typeof record.evaporatedLiters==='number'&&Number.isFinite(record.evaporatedLiters)){
        this.evaporated=Math.max(0,record.evaporatedLiters);
      }
      this.routeOverflow();
    }
  }

  /** Transfer legacy nine fixed puddle volumes to nearby true drainage sinks. */
  migrateLegacy(volumes: unknown): void {
    if(!Array.isArray(volumes) || volumes.length!==9)return;
    const oldLocations=[
      [-3.22,-2.40],[-.94,-3.25],[2.48,-2.20],[3.15,.65],
      [.52,1.85],[-3.10,2.36],[1.13,3.42],[-.62,-.10],[-1.72,1.13],
    ];
    for(let i=0;i<9;i++){
      const litres=volumes[i];
      if(typeof litres!=='number'|| !Number.isFinite(litres) || litres<=0)continue;
      const index=cellIndexAt(oldLocations[i][0],oldLocations[i][1]);
      let basin=this.watershed.cellBasin[index];
      if(basin<0 && this.watershed.basins.length){
        basin=this.watershed.basins.reduce((best,b)=>{
          const cell=this.watershed.cells[b.sinkIndex];
          const bestCell=this.watershed.cells[this.watershed.basins[best].sinkIndex];
          const d=(oldLocations[i][0]-cell.x)**2+(oldLocations[i][1]-cell.z)**2;
          const bd=(oldLocations[i][0]-bestCell.x)**2+(oldLocations[i][1]-bestCell.z)**2;
          return d<bd?b.id:best;
        },0);
      }
      if(basin>=0){
        this.water[basin]+=litres;
        this.deposited+=litres;
      }
    }
    this.routeOverflow();
  }

  private routeOverflow():void {
    // Basin parent links are acyclic and point toward the outside.
    for(const b of [...this.watershed.basins].sort((a,c)=>c.routeDepth-a.routeDepth)){
      const over=Math.max(0,this.water[b.id]-b.capacityLiters);
      if(over<=0)continue;
      this.water[b.id]-=over;
      if(b.outletId>=0)this.water[b.outletId]+=over;
      else this.exported+=over;
    }
  }

  advance(startHour:number, hours:number, overrideCover:number|null):number {
    if(!Number.isFinite(hours)||hours<=0)return 0;
    const steps=Math.max(1,Math.ceil(hours/.035));
    const dt=hours/steps;
    let deposited=0;
    for(let i=0;i<steps;i++){
      const hour=wrapHour(startHour+(i+.5)*dt);
      const cover=overrideCover===null?cloudCoverAtHour(hour):clamp01(overrideCover);
      const intensity=rainIntensityAtHour(hour,cover,overrideCover!==null);
      const rainfallLitresPerCell=PEAK_RAIN_MM_PER_HOUR*intensity*dt*CELL_AREA;
      const clouds=intensity>0 ? visibleClouds(hour,cover):[];
      const remainingIntake=this.watershed.cells.map(c=>
        infiltrationBudgetLiters(c.x,c.z,dt));

      // 011: local rain first fills available porous storage. Only the
      // remaining water moves downslope to a surface depression or exits.
      if(intensity>0)for(const cell of this.watershed.cells){
        const exposure=cloudExposure(cell,clouds);
        if(exposure<=0)continue;
        const amount=rainfallLitresPerCell*exposure;
        deposited+=amount;
        const available=Math.max(0,this.soilCaps[cell.index]-this.soil[cell.index]);
        const absorbed=Math.min(amount,available,remainingIntake[cell.index]);
        this.soil[cell.index]+=absorbed;
        remainingIntake[cell.index]-=absorbed;
        const runoff=amount-absorbed;
        const basin=this.watershed.cellBasin[cell.index];
        if(basin>=0)this.water[basin]+=runoff;
        else this.exported+=runoff;
      }

      // 011: existing ponds also seep into their submerged soil cells.
      // Use only leftover per-step intake to avoid double dipping rain.
      for(const basin of this.watershed.basins){
        if(this.water[basin.id]<=EPS)continue;
        const level=solveWaterLevel(this.watershed,basin,this.water[basin.id]);
        if(level===null)continue;
        for(const index of basin.cellIndexes){
          if(this.water[basin.id]<=EPS)break;
          if(this.watershed.cells[index].height>=level-EPS)continue;
          const capacity=Math.max(0,this.soilCaps[index]-this.soil[index]);
          const absorbed=Math.min(capacity,remainingIntake[index],this.water[basin.id]);
          if(absorbed<=0)continue;
          this.water[basin.id]-=absorbed;
          this.soil[index]+=absorbed;
          remainingIntake[index]-=absorbed;
        }
      }

      // 012: sunlight, cloud shade and wind remove ACTUAL stored water.
      const evap=evaporationMmPerHour(hour,cover)*dt*CELL_AREA;
      for(const cell of this.watershed.cells){
        const index=cell.index;
        const amount=Math.min(this.soil[index],
          evap*surfaceAt(cell.x,cell.z).evaporationMultiplier);
        this.soil[index]-=amount;
        this.evaporated+=amount;
      }
      for(const basin of this.watershed.basins){
        if(this.water[basin.id]<=EPS)continue;
        const level=solveWaterLevel(this.watershed,basin,this.water[basin.id]);
        if(level===null)continue;
        let submerged=0;
        for(const index of basin.cellIndexes){
          if(this.watershed.cells[index].height<level-EPS)submerged++;
        }
        const amount=Math.min(this.water[basin.id],evap*submerged);
        this.water[basin.id]-=amount;
        this.evaporated+=amount;
      }
      this.routeOverflow();
    }
    this.deposited+=deposited;
    return deposited;
  }

  basinLiters(id:number):number {return this.water[id]??0;}
  totalLiters():number {return this.water.reduce((a,b)=>a+b,0);}
  exportedLiters():number {return this.exported;}
  totalDepositedLiters():number {return this.deposited;}
  evaporatedLiters():number {return this.evaporated;}
  soilLiters(index:number):number {return this.soil[index]??0;}
  soilCapacity(index:number):number {return this.soilCaps[index]??0;}
  soilFraction(index:number):number {
    return this.soilCaps[index]>0 ? this.soil[index]/this.soilCaps[index]:0;
  }
  totalSoilLiters():number {return this.soil.reduce((a,b)=>a+b,0);}
  /** Cumulative rain = pond + soil + exported + evaporated. */
  massBalanceError():number {
    return this.deposited-this.totalLiters()-this.totalSoilLiters()
      -this.exported-this.evaporated;
  }
  surfaceLevel(id:number):number|null {
    const basin=this.watershed.basins[id];
    return basin?solveWaterLevel(this.watershed,basin,this.water[id]):null;
  }
  snapshot():WaterState {
    return {
      basins:this.watershed.basins.map(b=>({
        sinkIndex:b.sinkIndex,litres:this.water[b.id],
      })),
      exportedLiters:this.exported,
      totalDepositedLiters:this.deposited,
      soilLiters:[...this.soil],
      evaporatedLiters:this.evaporated,
    };
  }
  clear():void {
    this.water.fill(0);
    this.soil.fill(0);
    this.exported=0;this.deposited=0;this.evaporated=0;
  }
}
