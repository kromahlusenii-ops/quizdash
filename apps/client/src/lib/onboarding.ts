const STEP_KEY = 'quizdash_onboarding_step';
const TOTAL_STEPS = 5;

/** Returns current onboarding step (1-5), or null if onboarding is complete. */
export function getOnboardingStep(): number | null {
  const raw = localStorage.getItem(STEP_KEY);
  if (raw === 'done') return null;
  if (raw === null) return null; // not yet initialized
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1 || n > TOTAL_STEPS) return null;
  return n;
}

/** Initialize onboarding for a new user. No-op if already started or complete. */
export function initOnboarding() {
  const raw = localStorage.getItem(STEP_KEY);
  if (raw === null) {
    localStorage.setItem(STEP_KEY, '1');
  }
}

/** Advance to the next step. Completes if past the last step. */
export function advanceOnboarding() {
  const current = getOnboardingStep();
  if (current === null) return;
  if (current >= TOTAL_STEPS) {
    completeOnboarding();
  } else {
    localStorage.setItem(STEP_KEY, String(current + 1));
  }
}

/** Jump to a specific step (useful for auto-advancing past completed steps). */
export function setOnboardingStep(step: number) {
  if (step > TOTAL_STEPS) {
    completeOnboarding();
  } else {
    localStorage.setItem(STEP_KEY, String(step));
  }
}

/** Mark onboarding as permanently complete. */
export function completeOnboarding() {
  localStorage.setItem(STEP_KEY, 'done');
}

/** Reset onboarding (for testing). */
export function resetOnboarding() {
  localStorage.removeItem(STEP_KEY);
}
