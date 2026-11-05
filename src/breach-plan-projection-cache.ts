/** P7.2 — Project display routes at most once per actual camera transform.
 * The camera is compared by world/projection matrices, NOT a rounded yaw
 * or zoom. This preserves live touch movement and smooth camera easing.
 * Only immutable DisplayRouteCache point arrays may be memoized.
 */
import type {Pt} from './breach-core.ts';

type CameraMatrices={
  matrixWorld:{elements:readonly number[]};
  projectionMatrix:{elements:readonly number[]};
};
const same=(a:readonly number[]|null,b:readonly number[])=>
  a!==null&&a.length===b.length&&a.every((v,i)=>v===b[i]);

export class ProjectedRouteCache{
  private world:number[]|null=null;
  private projection:number[]|null=null;
  private width=0;
  private height=0;
  private projected=new WeakMap<readonly Pt[],Map<number,readonly Pt[]>>();
  hits=0;misses=0;invalidations=0;
  beginFrame(camera:CameraMatrices,width:number,height:number){
    const world=camera.matrixWorld.elements;
    const projection=camera.projectionMatrix.elements;
    if(width===this.width&&height===this.height&&
       same(this.world,world)&&same(this.projection,projection))return;
    this.width=width;this.height=height;
    this.world=Array.from(world);
    this.projection=Array.from(projection);
    this.projected=new WeakMap();
    this.invalidations++;
  }
  get(route:readonly Pt[],height:number,project:(p:Pt)=>Pt):readonly Pt[]{
    let byHeight=this.projected.get(route);
    const existing=byHeight?.get(height);
    if(existing){this.hits++;return existing;}
    this.misses++;
    const result=route.map(p=>project(p));
    if(!byHeight){byHeight=new Map();this.projected.set(route,byHeight);}
    byHeight.set(height,result);
    return result;
  }
  clear(){
    this.world=null;this.projection=null;
    this.projected=new WeakMap();this.invalidations++;
  }
}
