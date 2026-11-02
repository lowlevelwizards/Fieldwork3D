# Operator axis convention: migration contract

New public model-space convention: up +Y, front -Z, operator right +X.
Three.js cameras face -Z by default, and the front view looks at the face
from the negative Z side.

Gameplay world-space coordinates and heading = atan2(deltaZ,deltaX) are
UNCHANGED. No movement, combat, replay, fog, inventory or map migration.

New rig.root is the public, canonical (-Z front) node. The existing bones,
head, gun, grip, pack and old accessories live under rig.legacyFrame, a
fixed +90 degree Y child. For an original orientation Qold:
  Qroot = Qold * Y(-90deg)
  QlegacyFrame = Y(+90deg)
  Qroot * QlegacyFrame = Qold
This holds for arbitrary pitch/roll, not only flat yaw.

The existing IK, footstep scheduler, muzzle and weapon grip calculations
remain in legacy +X coordinates. Their authoritative old yaw is now
rig.legacyYaw. The root Euler yaw must not be used for combat math.

For new headgear, rig.headCanonicalFrame is a -90 degree Y child of the
legacy head. Author future vertices there using -Z forward, +X right.
For other old bones use createCanonicalAttachment(parent).

Do not globally replace +X expressions in old motion/weapon code.
Transform at explicit group boundaries. No change to saved transforms,
body proportions, recoil, foot anchors, replay track angles, or hitboxes.

Acceptance checks: headings 0/90/180/270, arbitrary yaw, aim, strafe,
walk, crouch, wounded, fall, dropped weapon, and replay seeking; compare
world head, foot, grip and muzzle origin against pre-adapter values.
The changes are source merged, but in-game visual behavior needs iPhone
verification before Stage 1 helmet modeling.
