/**
 * Cedar Relay's small deterministic 120 V distribution model.
 * Voltages are derived by traversing conductive edges from a working generator.
 * No renderer and no artificial "towerOnline" success flag.
 */
export type StationId = 'generator' | 'switchgear' | 'relay' | 'junction' | 'mast';
export type FaultId = 'generator' | 'feeder' | 'junction' | 'fuse' | 'terminal' | 'contactor';
export type Inspection = { station: StationId; voltage: number; description: string };
export const NETWORK_ORDER: readonly StationId[] =
  ['generator','switchgear','relay','junction','mast'];
export const faultStation = (kind: FaultId): StationId =>
  kind === 'feeder' ? 'switchgear' :
  kind === 'fuse' || kind === 'terminal' || kind === 'contactor' ? 'relay' : kind;
export const nextNetworkFault = (index: number): FaultId =>
  (['generator','feeder','junction','fuse','terminal','contactor'] as const)[Math.abs(Math.floor(index)) % 6];

type Edge = { from: StationId; to: StationId; available: () => boolean };
export class PowerNetwork {
  readonly fault: FaultId;
  generatorRunning = true;
  breakerClosed = true;
  breakerTripped = false;
  feedIntact = true;
  relayIntact = true;
  junctionIntact = true;
  repaired = false;
  oxidation = 0;
  testCount = 0;
  transientArc = 0;
  private readonly edges: Edge[];

  constructor(fault: FaultId, index = 0) {
    this.fault = fault;
    this.oxidation = fault === 'terminal' && Math.floor(Math.max(0,index)/6)%2 === 0 ? 0.86 : 0.35;
    this.generatorRunning = fault !== 'generator';
    this.feedIntact = fault !== 'feeder';
    this.relayIntact = !['fuse','terminal','contactor'].includes(fault);
    this.junctionIntact = fault !== 'junction';
    this.breakerTripped = fault === 'junction';
    if (this.breakerTripped) this.breakerClosed = false;
    this.edges = [
      {from:'generator',to:'switchgear',available:() => this.breakerClosed && !this.breakerTripped},
      {from:'switchgear',to:'relay',available:() => this.feedIntact},
      {from:'relay',to:'junction',available:() => this.relayIntact},
      {from:'junction',to:'mast',available:() => this.junctionIntact},
    ];
  }

  /** Actual graph traversal of energized nodes. */
  get energized(): ReadonlySet<StationId> {
    const hot = new Set<StationId>();
    if (!this.generatorRunning) return hot;
    hot.add('generator');
    for (const edge of this.edges) {
      if (hot.has(edge.from) && edge.available()) hot.add(edge.to);
    }
    return hot;
  }
  voltageAt(station: StationId): number { return this.energized.has(station) ? 120 : 0; }
  get mastOnline() { return this.voltageAt('mast') === 120; }
  get breakerIsolated() { return !this.breakerClosed; }
  get isSafeForRepair() { return this.breakerIsolated && !this.generatorRunning ? true : this.breakerIsolated; }

  isolate() {
    this.breakerClosed = false;
  }
  reenergize() {
    // An unrepaired short immediately trips protection when connected.
    if (!this.junctionIntact) {
      this.breakerTripped = true;
      this.breakerClosed = false;
      this.transientArc = 0.65;
      return false;
    }
    this.breakerTripped = false;
    this.breakerClosed = true;
    return true;
  }
  repair(isolated: boolean): boolean {
    if (this.repaired) return false;
    if (this.fault !== 'generator' && !isolated) return false;
    this.repaired = true;
    if (this.fault === 'generator') this.generatorRunning = true;
    if (this.fault === 'feeder') this.feedIntact = true;
    if (['fuse','terminal','contactor'].includes(this.fault)) this.relayIntact = true;
    if (this.fault === 'junction') this.junctionIntact = true;
    return true;
  }
  /**
   * A test is a measurement, not a scripted success. Oxidized terminals can
   * reveal a second open connection when first energized.
   */
  test(): 'offline' | 'trip' | 'online' {
    this.testCount++;
    if (this.fault === 'terminal' && this.oxidation > 0.7 &&
        this.testCount === 1 && this.repaired) {
      this.relayIntact = false;
      this.repaired = false;
      this.breakerClosed = false;
      this.breakerTripped = true;
      this.transientArc = 0.65;
      return 'trip';
    }
    return this.mastOnline ? 'online' : 'offline';
  }
  tick(dt: number) { this.transientArc = Math.max(0, this.transientArc - Math.max(0,dt)); }

  inspection(station: StationId): Inspection {
    const volts = this.voltageAt(station);
    let description = volts ? '120 V PRESENT' : 'NO VOLTAGE';
    if (station === 'generator') {
      description = this.generatorRunning ? 'GENERATOR OUTPUT 120 V · RUNNING' :
        'ENGINE STOPPED · OUTPUT 0 V';
    } else if (station === 'switchgear') {
      description = this.breakerTripped ? 'PROTECTION TRIPPED · OUTPUT 0 V' :
        !this.breakerClosed ? 'SUPPLY ISOLATED · OUTPUT 0 V' :
        'BREAKER CLOSED · ' + volts + ' V';
      if (this.fault === 'feeder' && !this.repaired && volts) description += ' · FEEDER OPEN';
    } else if (station === 'relay') {
      description = volts ? 'RELAY INPUT 120 V' : 'RELAY INPUT 0 V';
      if (!this.relayIntact && volts) description += ' · INTERNAL OPEN CIRCUIT';
    } else if (station === 'junction') {
      description = this.fault === 'junction' && !this.repaired ?
        'SHORTED JUNCTION · SCORCHED TERMINAL' : 'JUNCTION ' + volts + ' V';
    } else if (station === 'mast') {
      description = this.mastOnline ? 'RADIO TRANSMITTING' : 'RADIO OFFLINE';
    }
    return {station,voltage:volts,description};
  }
}
