/** Resource ownership for materials unique to one generated site.
 * Shared palettes, cached pixel materials and persistent scene resources
 * never belong here. Idempotent disposal makes repeated site swaps safe.
 */
export class SiteMaterialLifetime<T extends {dispose():void}>{
  private readonly owned=new Set<T>();
  get size(){return this.owned.size;}
  track(material:T):T{
    this.owned.add(material);return material;
  }
  reset():void{
    for(const material of this.owned)material.dispose();
    this.owned.clear();
  }
}
