/**
 * Haptic feedback utility for mobile devices
 * Provides vibration feedback for touch interactions
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [50, 100, 50, 100, 50],
};

/**
 * Trigger haptic feedback if supported by the device
 */
export function triggerHaptic(pattern: HapticPattern = "light"): void {
  // Check if vibration API is supported
  if (!("vibrate" in navigator)) {
    return;
  }

  try {
    const vibrationPattern = patterns[pattern];
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug("Haptic feedback failed:", error);
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return "vibrate" in navigator;
}

/**
 * Haptic feedback for button clicks
 */
export function hapticClick(): void {
  triggerHaptic("light");
}

/**
 * Haptic feedback for successful actions
 */
export function hapticSuccess(): void {
  triggerHaptic("success");
}

/**
 * Haptic feedback for errors
 */
export function hapticError(): void {
  triggerHaptic("error");
}

/**
 * Haptic feedback for warnings
 */
export function hapticWarning(): void {
  triggerHaptic("warning");
}

/**
 * Haptic feedback for drag operations
 */
export function hapticDrag(): void {
  triggerHaptic("medium");
}

