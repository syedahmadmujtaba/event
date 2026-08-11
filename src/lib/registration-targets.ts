// Fixed vocabulary of who may self-register for an event (registerableBy).
// Client-safe (no server-only deps) so dialogs can render the same checkboxes.
export const REGISTRATION_TARGETS = ["delegation", "host_student", "visitor"] as const;
export type RegistrationTarget = (typeof REGISTRATION_TARGETS)[number];
