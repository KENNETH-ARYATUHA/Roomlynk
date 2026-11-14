// Doc §16: "Maintain append-only audit events for approvals...".
// Call recordAudit() after every sensitive action. We only ever create rows.

import { prisma } from '../db';

interface AuditInput {
  actorId?: string | null;
  action: string; // dot-style name, e.g. "landlord.approve"
  entityType: string; // e.g. "LandlordProfile"
  entityId: string;
  reason?: string | null;
}

export async function recordAudit(input: AuditInput) {
  await prisma.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason ?? null,
    },
  });
}
