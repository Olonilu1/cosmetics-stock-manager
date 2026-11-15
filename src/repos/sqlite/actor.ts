import type { StaffMember } from "../types";

// Who is signed in right now, module-scoped so repos can stamp the audit log.
let actor: StaffMember | null = null;

export const currentActor = {
  get: () => actor,
  set(next: StaffMember | null) {
    actor = next;
  },
};
