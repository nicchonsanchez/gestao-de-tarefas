import { Module } from '@nestjs/common';

import { OrganizationsService } from './organizations.service';
import { MembershipsService } from './memberships.service';
import { InvitationsService } from './invitations.service';
import { OrganizationsController } from './organizations.controller';
import { InvitationsController } from './invitations.controller';
import { TenantGuard } from '@/common/tenant/tenant.guard';

@Module({
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService, MembershipsService, InvitationsService, TenantGuard],
  exports: [OrganizationsService, MembershipsService, InvitationsService],
})
export class OrganizationsModule {}
