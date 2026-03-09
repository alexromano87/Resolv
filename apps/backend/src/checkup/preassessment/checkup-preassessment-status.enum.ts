/**
 * Possible lifecycle states for a CheckupPreassessment record.
 *
 * - IN_PROGRESS : The preassessment is being actively filled out.
 * - CONCLUSO    : All required sections have been validated and the
 *                 preassessment has been marked as complete.
 */
export enum CheckupPreassessmentStatus {
  IN_PROGRESS = 'in_progress',
  CONCLUSO = 'concluso',
}
