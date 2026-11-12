/** B7 — tiny shared preview rig teardown, not a new scene/pose controller.
 * Tactical actor disposal, renderer/context lifecycle, Studio lighting and
 * Arsenal's weapon-only viewport retain their own owners. This helper
 * merely preserves the identical detach → optional owner-specific cleanup
 * → rig.dispose() ordering for temporary operator previews.
 */
import type * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';

export function releaseOperatorPreviewRig(
 host:THREE.Object3D,rig:OperatorRig,afterDetach?:()=>void
):void{
 host.remove(rig.root);
 try{afterDetach?.();}
 finally{rig.dispose();}
}
