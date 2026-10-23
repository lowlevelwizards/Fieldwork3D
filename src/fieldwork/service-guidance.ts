import type { StationId } from '../systems/power-network.ts';
import type { NetworkJob } from './network-job.ts';

export const stationDisplayName: Readonly<Record<StationId,string>> = {
  generator:'GENERATOR', switchgear:'SWITCHGEAR', relay:'RELAY CABINET',
  junction:'JUNCTION BOX', mast:'RADIO MAST',
};

/** A meter reports genuine voltage; guidance interprets it without revealing
 * hidden fault identities prior to physical observation. */
export function inspectionGuidance(job: NetworkJob, station: StationId): string {
  const reading = job.network.inspection(station);
  if(job.diagnosed)
    return reading.description + ' · FAULT AT ' + stationDisplayName[job.target];
  if(station==='relay' && reading.voltage===0)
    return 'RELAY INPUT 0 V · CHECK SWITCHGEAR UPSTREAM';
  if(station==='relay' && reading.voltage>0)
    return 'RELAY INPUT LIVE · CHECK RELAY COMPONENTS';
  if(station==='switchgear' && reading.voltage===0)
    return 'SWITCHGEAR OFFLINE · CHECK GENERATOR AND BREAKER';
  if(station==='switchgear' && reading.voltage>0)
    return reading.description + ' · TRACE FEEDER AND RELAY';
  return reading.description;
}

/** The physical worksite remains authoritative: receiving an item does not
 * repair a distant machine, but it makes the next destination actionable. */
export function diagnosedDestination(job: NetworkJob, currentStation: StationId | null): StationId | null {
  if(!job.diagnosed || job.finished || currentStation===job.target) return null;
  return job.target;
}
