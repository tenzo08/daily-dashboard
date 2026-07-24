// Typed wrapper around window.api — feature code imports from here, never
// calls window.api directly, so there's a single seam if the bridge shape
// ever changes.
export const api = window.api
