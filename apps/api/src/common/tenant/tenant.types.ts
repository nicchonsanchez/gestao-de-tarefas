import type { OrgRole } from '@prisma/client';

export interface TenantContext {
  organizationId: string;
  organizationSlug: string;
  role: OrgRole;
  membershipId: string;
}
