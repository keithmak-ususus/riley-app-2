// What each phone can choose to receive (issue #4). Tiny and dependency-free, so the app and the sender share it.
export const KINDS = { trip: "A trip outside is due", treatment: "Treatments and appointments", photo: "Photo of the day" };
export const DEFAULT_PREFS = { trip: true, treatment: true, photo: false, quiet: { on: true, from: "22:00", to: "06:00" } };
export const withDefaults = (p = {}) => ({ ...DEFAULT_PREFS, ...p, quiet: { ...DEFAULT_PREFS.quiet, ...(p.quiet || {}) } });
