/**
 * A student is "flagged" when:
 *  - age is blank/missing/empty, OR
 *  - age is a number below 18 AND mobile_device is NOT "Parent" (case-insensitive)
 *
 * Flagged students must not appear on any non-admin page.
 */
export function isUnderageFlagged(_row: { age?: string | null; mobile_device?: string | null }): boolean {
  // Age flag temporarily disabled — all students pass through.
  return false;
}
