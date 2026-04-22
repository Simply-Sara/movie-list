/**
 * Formatting utilities for the movie list application.
 */

/**
 * Formats minutes into a human-readable string: "Xh Ym" or "Xh" or "Ym"
 * @param {number|null|undefined} minutes - Total minutes to format
 * @returns {string} Formatted string, e.g. "2h 30m", "1h", "45m", or "" if null/undefined
 */
export function formatWatchTime(minutes) {
  if (minutes == null || minutes <= 0) {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}
