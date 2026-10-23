// Pure, deterministic procedure. No rendering or browser dependencies: the same
// contract can later be driven by a player or by an autonomous operator.
export type RelayPhase =
  | 'idle' | 'approaching' | 'opening' | 'open'
  | 'inspecting' | 'inspected' | 'replacing' | 'replaced'
  | 'closing' | 'complete';

export type RelayAction = 'inspect' | 'replace' | 'restore';

const durations: Partial<Record<RelayPhase, number>> = {
  opening: 1.3,
  inspecting: 1.5,
  replacing: 2.1,
  closing: 1.8,
};
const transitions: Partial<Record<RelayPhase, RelayPhase>> = {
  opening: 'open',
  inspecting: 'inspected',
  replacing: 'replaced',
  closing: 'complete',
};
const prompts: Partial<Record<RelayPhase, string>> = {
  idle: 'CHECK RELAY',
  open: 'INSPECT FUSE',
  inspected: 'REPLACE FUSE',
  replaced: 'RESTORE POWER',
};

export class RelayProcedure {
  phase: RelayPhase;
  elapsed = 0;

  constructor(alreadyRestored = false) {
    this.phase = alreadyRestored ? 'complete' : 'idle';
  }

  get complete() { return this.phase === 'complete'; }
  get travelling() { return this.phase === 'approaching'; }
  get busy() {
    return this.phase === 'opening' || this.phase === 'inspecting' ||
      this.phase === 'replacing' || this.phase === 'closing';
  }
  get working() {
    return this.busy || ['open', 'inspected', 'replaced'].includes(this.phase);
  }
  get prompt() { return prompts[this.phase] ?? null; }
  get progress() {
    const duration = durations[this.phase];
    return duration ? Math.min(1, this.elapsed / duration) : 1;
  }

  /** Request an action. World code must establish proximity before applying it. */
  interact(near: boolean, hasReplacement = true): boolean {
    if (this.busy || this.complete || this.travelling) return false;
    if (this.phase === 'idle') {
      this.change(near ? 'opening' : 'approaching');
      return true;
    }
    if (!near) return false;
    if (this.phase === 'open') this.change('inspecting');
    else if (this.phase === 'inspected' && hasReplacement) this.change('replacing');
    else if (this.phase === 'replaced') this.change('closing');
    else return false;
    return true;
  }

  reset() { this.change('idle'); }

  cancelApproach() {
    if (this.phase === 'approaching') this.change('idle');
  }

  update(delta: number, near: boolean) {
    if (this.travelling && near) {
      this.change('opening');
      return;
    }
    const duration = durations[this.phase];
    if (!duration) return;
    this.elapsed = Math.min(duration, this.elapsed + Math.max(0, delta));
    if (this.elapsed >= duration) this.change(transitions[this.phase]!);
  }

  private change(next: RelayPhase) {
    this.phase = next;
    this.elapsed = 0;
  }
}
