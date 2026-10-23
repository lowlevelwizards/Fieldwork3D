import {PowerNetwork,nextNetworkFault,faultStation,type StationId,type Inspection} from '../systems/power-network';

/** Observation-and-repair loop, independent of WebGL, locomotion and UI.
 * Exactly one machine needs work. The clue is not known until inspected. */
export type JobPhase = 'searching' | 'diagnosed' | 'working' | 'prepared' |
  'secondary' | 'complete' | 'deferred';
export class NetworkJob {
  readonly network:PowerNetwork;
  readonly index:number;
  readonly observations = new Map<StationId,Inspection>();
  phase:JobPhase='searching';
  progress=0;
  holding=false;
  private secondRepair=false;
  constructor(index:number) {
    this.index=index;
    this.network=new PowerNetwork(nextNetworkFault(index),index);
  }
  get target():StationId{return faultStation(this.network.fault);}
  get diagnosed(){return this.phase!=='searching';}
  get finished(){return this.phase==='complete'||this.phase==='deferred';}
  get requiresHardware(){return this.network.fault!=='contactor' && !this.secondRepair;}
  get requiresIsolation(){return this.network.fault!=='generator';}
  get holdSeconds(){return this.secondRepair?1.6:
    this.network.fault==='generator'?2.8:
    this.network.fault==='feeder'?2.2:
    this.network.fault==='junction'?2.7:2.1;}
  get actionLabel():string|null{
    if(this.phase==='working'||this.phase==='diagnosed'||this.phase==='secondary'){
      const name=this.secondRepair?'RESEAT TERMINAL':
        this.network.fault==='generator'?'RESTART GENERATOR':
        this.network.fault==='feeder'?'SPLICE FEEDER':
        this.network.fault==='junction'?'REBUILD JUNCTION':
        this.network.fault==='fuse'?'INSTALL FUSE':
        this.network.fault==='terminal'?'SECURE TERMINAL':'FREE CONTACTOR';
      return 'HOLD TO '+name;
    }
    return this.phase==='prepared'?'TEST CIRCUIT':null;
  }
  inspect(station:StationId):{observation:Inspection;newDiagnosis:boolean}{
    const result=this.network.inspection(station);
    this.observations.set(station,result);
    const newDiagnosis=this.phase==='searching'&&station===this.target;
    if(newDiagnosis)this.phase='diagnosed';
    return{observation:result,newDiagnosis};
  }
  canStart(supplied:boolean,isolated:boolean){
    return (this.phase==='diagnosed'||this.phase==='secondary'||this.phase==='working') &&
      (!this.requiresHardware||supplied) && (!this.requiresIsolation||isolated);
  }
  begin(supplied:boolean,isolated:boolean):boolean{
    if(!this.canStart(supplied,isolated))return false;
    this.phase='working';this.holding=true;return true;
  }
  release(){this.holding=false;}
  update(dt:number,near:boolean,supplied:boolean,isolated:boolean):'repaired'|null{
    this.network.tick(dt);
    if(this.phase!=='working')return null;
    if(!near||(!this.canStart(supplied,isolated))){
      this.holding=false;
      this.phase=this.secondRepair?'secondary':'diagnosed';return null;
    }
    if(this.holding)this.progress+=Math.max(0,Math.min(dt,.07));
    else this.progress=Math.max(0,this.progress-dt*.06);
    if(this.progress<this.holdSeconds)return null;
    this.holding=false;
    if(!this.network.repair(isolated)){
      this.phase=this.secondRepair?'secondary':'diagnosed';return null;
    }
    this.phase='prepared';this.progress=0;return 'repaired';
  }
  test(){
    if(this.phase!=='prepared'||this.network.breakerIsolated)return null;
    const result=this.network.test();
    if(result==='online'){this.phase='complete';return 'complete' as const;}
    if(result==='trip'){this.phase='secondary';this.secondRepair=true;this.progress=0;return 'trip' as const;}
    return 'offline' as const;
  }
  defer():boolean{
    if(!['diagnosed','prepared','secondary'].includes(this.phase))return false;
    this.phase='deferred';this.holding=false;return true;
  }
}
