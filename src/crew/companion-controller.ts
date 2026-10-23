import type { NavigationGrid, Point2 } from '../navigation/grid';
import type { Operator } from '../actors/operator';
import type { CrewMission } from './crew-mission';
import type { TruckDepot } from './truck-depot';

const dist = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Deliberately small obligation executor. Replanning a moving target does not
 * discard the fetch/delivery obligation. Actor locomotion remains the only
 * path executor, with no teleports or hidden progress.
 */
export class CompanionController {
  private previousGoal: Point2 | null = null;
  private elapsed = 0;
  private lastStage = '';

  constructor(readonly mica: Operator, private readonly nav: NavigationGrid) {}

  reset() {
    this.previousGoal = null;
    this.lastStage = '';
    this.mica.clearRoute();
    this.mica.setSocialPose('none');
  }

  update(dt: number, rook: Operator, mission: CrewMission, depot: TruckDepot, surveyTarget: Point2 | null = null) {
    const stage = mission.stage;
    if (stage !== this.lastStage) {
      this.lastStage = stage;
      this.previousGoal = null;
    }
    const here = this.mica.position;
    const receiver = rook.position;
    let goal: Point2 | null = null;
    let mode: 'none' | 'carry' | 'collect' | 'handoff' | 'receive' | 'wait' = 'wait';
    let face: Point2 | null = null;

    if (stage === 'fetching' || stage === 'retrieving' || stage === 'energizing') {
      goal = depot.standPoint;
      face = { x: 8, z: 7 };
      mode = stage === 'retrieving' || stage === 'energizing' ? 'collect' : 'none';
    } else if (stage === 'delivering' || stage === 'handoff') {
      // Stage moves with Rook: delivery survives him walking away mid-route.
      const options = [
        { x: receiver.x + 1.12, z: receiver.z + 0.24 },
        { x: receiver.x - 1.12, z: receiver.z + 0.24 },
        { x: receiver.x, z: receiver.z + 1.22 },
      ];
      goal = options.find(p => this.nav.canOccupy(p)) ?? receiver;
      face = receiver;
      mode = stage === 'handoff' ? 'handoff' : 'carry';
    } else if (stage === 'returning' || stage === 'finished') {
      goal = depot.secondReturnPoint;
      face = rook.position;
      mode = mission.micaHasFuse ? 'carry' : dist(here, depot.secondReturnPoint) > 1.1 ? 'none' : 'wait';
    } else if (stage === 'standby' && surveyTarget) {
      // Separate independent inspection. Mica takes a real navigable route,
      // reports only after physically arriving, and can be reassigned later.
      goal = surveyTarget;
      face = { x: surveyTarget.x, z: surveyTarget.z - 1.4 };
      mode = dist(here, surveyTarget) < 1.0 ? 'collect' : 'none';
    } else if (stage === 'standby') {
      // Natural offset rather than copying Rook's exact position.
      const follow = { x: receiver.x + 1.65, z: receiver.z + 1.02 };
      goal = dist(here, follow) > 3.2 ? follow : null;
      face = receiver;
      mode = dist(here, follow) > 3.2 ? 'none' : 'wait';
    } else if (stage === 'delivered') {
      const wait = { x: receiver.x + 2.2, z: receiver.z + 1.2 };
      goal = dist(here, wait) > 3.1 ? wait : null;
      face = receiver;
    }

    this.mica.setSocialPose(mode, face);
    this.mica.setDrive(null);
    if (goal && dist(here, goal) > 0.55) {
      this.elapsed += dt;
      const changed = !this.previousGoal || dist(this.previousGoal, goal) > 0.95;
      if (changed || this.elapsed >= 1.2) {
        const path = this.nav.findPath(here, goal);
        if (path.length) this.mica.follow(path);
        this.previousGoal = { ...goal };
        this.elapsed = 0;
      }
    } else {
      this.mica.clearRoute();
      this.previousGoal = null;
      this.elapsed = 0;
    }
    this.mica.update(dt, this.nav);
  }
}
