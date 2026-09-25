import type { Object3D } from "three";

/** Chapter-owned decorative objects retain their mathematical source but are
 * excluded from the strict comparison. Shared geometry is never changed here. */
export function configurePoeticObjects(enabled: boolean, ...objects: Object3D[]): void {
  for (const object of objects) {
    object.userData.layer ??= "poetic";
    object.visible = enabled;
  }
}
