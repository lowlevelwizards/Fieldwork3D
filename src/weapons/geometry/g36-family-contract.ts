/** P5: authoritative live original-G36 service-art factory contract.
 * Local art extents and animation presentation; no ballistic/feed migration.
 */
import {G36_B_ART as A} from './g36-art-layout.ts';
/** Stable shared identifiers; the blockout and eventual six-slot factory
 * preset MUST read this exact table rather than copy/paste IDs. */
export const G36_B_PART_IDS=Object.freeze({
 stock:'g36-stock',receiver:'g36-dual-receiver',
 grip:'g36-grip',magazine:'g36-mag30',
 handguard:'g36-handguard-long',barrel:'g36-barrel-480'
});
export const G36_E0_FACTORY=Object.freeze({
 factoryId:'g36-service',
 family:'g36',weaponClass:'rifle',
 parts:G36_B_PART_IDS,
 // A G36-specific polymer-magazine identity: never silently treat
 // similar-looking 5.56 magazines as universal physical STANAG feeds.
 feedVisualId:'g36-polymer-556',
 integratedOptics:'original-dual',
 mountingPolicy:'no-rail-or-duplicate-sights',
 displayScale:A.displayLongitudinalScale,
 stockX:A.stockRearX,muzzleX:A.muzzleX,muzzleY:A.barrelAxisY,
 primaryX:-4.65,primaryY:-4.10,
 supportNearX:A.handguardFullStartX+.65,
 supportFarX:A.handguardFrontX-1.35,
 supportY:-1.35,
 magazineMouthX:.45,magazineMouthY:-3.00,
 lowerSightY:3.99,upperSightY:4.88
});
