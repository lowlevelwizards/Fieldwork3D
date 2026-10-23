export type FaultKind = 'fuse' | 'terminal' | 'contactor';
export type IncidentPhase =
  | 'idle' | 'approaching' | 'opening' | 'open' | 'inspecting'
  | 'diagnosed' | 'working' | 'prepared' | 'testing' | 'secondary'
  | 'closing' | 'complete' | 'deferred';
export type IncidentOutcome = 'restored' | 'deferred' | null;
export type ServiceEvent = 'opened' | 'diagnosed' | 'worked' | 'trip' | 'restored' | 'deferred' | null;

const labels: Record<FaultKind, string> = {
  fuse: 'BLOWN FUSE', terminal: 'LOOSE TERMINAL', contactor: 'JAMMED CONTACTOR',
};

export type IncidentPlan = {
  fault: FaultKind;
  /** 0..1 contact oxidation; excessive corrosion provokes a test trip. */
  oxidation: number;
  /** Mechanical resistance of the fault; governs time under the work action. */
  resistance: number;
};
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

/** Local repeatable variety, no non-deterministic render-frame RNG. */
export function planIncident(index: number): IncidentPlan {
  const round = Math.max(0, Math.floor(index));
  const fault: FaultKind = (['fuse', 'terminal', 'contactor'] as const)[round % 3];
  const oxidation = fault === 'terminal' ? (Math.floor(round / 3) % 2 ? 0.43 : 0.83) : 0.22;
  const resistance = 0.25 + ((round * 7 + 3) % 5) * 0.12;
  return { fault, oxidation, resistance };
}

export class FieldIncident {
  phase: IncidentPhase = 'idle';
  readonly plan: IncidentPlan;
  progress = 0;
  timer = 0;
  circuitIsolated = false;
  replacementInstalled = false;
  tripped = false;
  testsPerformed = 0;
  tripFlashTime = 0;
  outcome: IncidentOutcome = null;
  private holding = false;
  private recovering = false;

  constructor(plan: IncidentPlan) { this.plan = plan; }

  get fault() { return this.plan.fault; }
  get diagnosed() { return !['idle','approaching','opening','open','inspecting'].includes(this.phase); }
  get diagnosis() { return this.diagnosed ? labels[this.fault] : 'UNDETERMINED'; }
  get busy() { return ['opening','inspecting','testing','closing'].includes(this.phase); }
  get finished() { return this.phase === 'complete' || this.phase === 'deferred'; }
  get needsSupply() { return this.fault === 'fuse' || this.fault === 'terminal'; }
  get isHolding() { return this.holding; }
  get workReady() { return this.phase === 'diagnosed' || this.phase === 'secondary'; }
  get requiresIsolation() { return this.fault === 'contactor' || (this.phase === 'secondary' || this.recovering); }
  get actionLabel(): string | null {
    switch (this.phase) {
      case 'idle': return 'CHECK RELAY';
      case 'open': return 'INSPECT';
      case 'diagnosed':
        return this.fault === 'fuse' ? 'HOLD TO FIT FUSE' :
          this.fault === 'terminal' ? 'HOLD TO SECURE' : 'HOLD TO FREE CONTACTOR';
      case 'secondary': return 'HOLD TO RESEAT';
      case 'working': return this.recovering ? 'HOLD TO RESEAT' :
        this.fault === 'fuse' ? 'HOLD TO FIT FUSE' :
        this.fault === 'terminal' ? 'HOLD TO SECURE' : 'HOLD TO FREE CONTACTOR';
      case 'prepared': return 'TEST CIRCUIT';
      default: return null;
    }
  }
  get workDuration() {
    const base = this.fault === 'fuse' ? 1.25 : this.fault === 'terminal' ? 1.7 : 1.95;
    return this.recovering ? 1.3 : base + this.plan.resistance * 0.7;
  }
  get completion() { return clamp(this.progress / Math.max(0.1, this.workDuration), 0, 1); }

  interact(near: boolean, ready: boolean): boolean {
    if (!near && this.phase !== 'idle') return false;
    if (this.busy || this.finished) return false;
    if (this.phase === 'working') {
      if (near && ready) { this.holding = true; return true; }
      return false;
    }
    if (this.phase === 'idle') {
      this.transition(near ? 'opening' : 'approaching');
      return true;
    }
    if (this.phase === 'open') { this.transition('inspecting'); return true; }
    if (this.phase === 'prepared') { this.transition('testing'); return true; }
    if (this.workReady && ready) {
      this.recovering = this.recovering || this.phase === 'secondary';
      this.transition('working');
      this.holding = true;
      return true;
    }
    return false;
  }

  cancelApproach() {
    if (this.phase === 'approaching') this.transition('idle');
  }
  stopHolding() { this.holding = false; }
  hold() { if (this.phase === 'working') this.holding = true; }

  defer() {
    if (!['diagnosed','secondary','prepared'].includes(this.phase)) return false;
    this.outcome = 'deferred';
    this.transition('deferred');
    return true;
  }

  update(dt: number, near: boolean, available: boolean, isolated: boolean): ServiceEvent {
    const delta = clamp(dt, 0, 0.1);
    this.circuitIsolated = isolated;
    this.tripFlashTime = Math.max(0, this.tripFlashTime - delta);
    if (this.phase === 'approaching' && near) this.transition('opening');
    if (this.phase === 'opening' || this.phase === 'inspecting' || this.phase === 'testing' || this.phase === 'closing') {
      this.timer += delta;
      if (this.phase === 'opening' && this.timer >= 1.25) { this.transition('open'); return 'opened'; }
      if (this.phase === 'inspecting' && this.timer >= 1.45) { this.transition('diagnosed'); return 'diagnosed'; }
      if (this.phase === 'testing' && this.timer >= 1.2) {
        this.testsPerformed++;
        const shouldTrip = this.fault === 'terminal' &&
          this.plan.oxidation > 0.7 && this.testsPerformed === 1;
        if (shouldTrip) {
          this.tripped = true;
          this.tripFlashTime = 0.75;
          this.recovering = true;
          this.replacementInstalled = false;
          this.progress = 0;
          this.transition('secondary');
          return 'trip';
        }
        this.transition('closing');
      }
      if (this.phase === 'closing' && this.timer >= 1.35) {
        this.outcome = 'restored';
        this.transition('complete');
        return 'restored';
      }
    } else if (this.phase === 'working') {
      if (!near || !available || (this.requiresIsolation && !isolated)) {
        this.holding = false;
        this.transition(this.tripped ? 'secondary' : 'diagnosed');
        return null;
      }
      if (this.holding) {
        this.progress = Math.min(this.workDuration, this.progress + delta);
        if (this.progress >= this.workDuration) {
          this.replacementInstalled = true;
          this.holding = false;
          this.transition('prepared');
          return 'worked';
        }
      } else {
        this.progress = Math.max(0, this.progress - delta * 0.13);
      }
    }
    return null;
  }

  private transition(next: IncidentPhase) {
    this.phase = next; this.timer = 0;
    if (next === 'working' && this.progress < 0) this.progress = 0;
  }
}
