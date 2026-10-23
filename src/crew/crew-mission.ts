/**
 * One causal work order. The provider owns an obligation (fetch/deliver),
 * independent of animation, path, viewport or how many times the target moves.
 */
export type SupplyStage =
  | 'standby' | 'fetching' | 'retrieving' | 'delivering'
  | 'handoff' | 'delivered' | 'energizing' | 'returning' | 'finished';

export type CrewEvent = 'collect' | 'handoff' | 'delivered' | 'isolated' | 'energized' | 'finished';
export type CrewAssignment = 'fuse' | 'terminal' | 'isolation';
export type CrewSnapshot = {
  stage: SupplyStage; hasTruckFuse: boolean; micaHasFuse: boolean;
  rookHasFuse: boolean; relayPowered: boolean;
};
export class CrewMission {
  stage: SupplyStage = 'standby';
  timer = 0;
  relayPowered = false;
  hasTruckFuse = true;
  micaHasFuse = false;
  rookHasFuse = false;
  assignment: CrewAssignment = 'fuse';
  powerIsolated = false;

  diagnose(assignment: CrewAssignment = 'fuse') {
    if (this.stage !== 'standby') return false;
    this.assignment = assignment;
    this.stage = 'fetching';
    return true;
  }

  reassignIsolation() {
    if (this.stage !== 'delivered') return false;
    this.assignment = 'isolation';
    this.stage = 'fetching';
    this.powerIsolated = false;
    this.timer = 0;
    return true;
  }
  requestReenergize() {
    if (this.stage !== 'delivered' || !this.powerIsolated) return false;
    this.stage = 'energizing';
    this.timer = 0;
    return true;
  }

  // The distance checks are supplied by the physical world, not fabricated
  // arrival timers. They must remain true to transition.
  advance(dt: number, micaAtTruck: boolean, micaNearRook: boolean, crewAtTruck: boolean): CrewEvent | null {
    const delta = Math.max(0, Math.min(dt, 0.1));
    if (this.stage === 'fetching' && micaAtTruck) {
      this.stage = 'retrieving'; this.timer = 0;
    }
    if (this.stage === 'retrieving' && micaAtTruck) {
      this.timer += delta;
      if (this.timer >= 1.35) {
        this.timer = 0;
        if (this.assignment === 'isolation') {
          this.powerIsolated = true;
          this.stage = 'delivered';
          return 'isolated';
        }
        this.hasTruckFuse = false;
        this.micaHasFuse = true;
        this.stage = 'delivering';
        return 'collect';
      }
    }
    if (this.stage === 'delivering' && micaNearRook) {
      this.stage = 'handoff'; this.timer = 0;
    }
    if (this.stage === 'handoff') {
      if (!micaNearRook) { this.stage = 'delivering'; this.timer = 0; return null; }
      this.timer += delta;
      if (this.timer >= 1.25) {
        this.micaHasFuse = false;
        this.rookHasFuse = true;
        this.stage = 'delivered';
        this.timer = 0;
        return 'delivered';
      }
    }
    if (this.stage === 'energizing' && micaAtTruck) {
      this.timer += delta;
      if (this.timer >= 1.15) {
        this.powerIsolated = false;
        this.timer = 0;
        this.stage = 'delivered';
        return 'energized';
      }
    }
    if (this.stage === 'returning' && crewAtTruck) {
      this.stage = 'finished';
      return 'finished';
    }
    return null;
  }

  installFuse(): boolean {
    if (this.stage !== 'delivered' || !this.rookHasFuse) return false;
    this.rookHasFuse = false;
    return true;
  }
  finishJob(restored: boolean) {
    if (this.stage === 'returning' || this.stage === 'finished') return false;
    this.relayPowered = restored;
    this.stage = 'returning';
    this.timer = 0;
    return true;
  }

  restorePower() {
    if (this.stage !== 'delivered' || this.rookHasFuse) return false;
    return this.finishJob(true);
  }
  reset() {
    this.stage = 'standby';
    this.timer = 0; this.relayPowered = false;
    this.hasTruckFuse = true; this.micaHasFuse = false; this.rookHasFuse = false;
    this.assignment = 'fuse'; this.powerIsolated = false;
  }
  get snapshot(): CrewSnapshot {
    return {
      stage: this.stage, hasTruckFuse: this.hasTruckFuse,
      micaHasFuse: this.micaHasFuse, rookHasFuse: this.rookHasFuse,
      relayPowered: this.relayPowered,
    };
  }
}
