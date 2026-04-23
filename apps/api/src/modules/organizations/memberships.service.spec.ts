import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { MembershipsService } from './memberships.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('MembershipsService — teto por rank', () => {
  let service: MembershipsService;
  let prisma: {
    membership: {
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      membership: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'm1' }),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [MembershipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MembershipsService);
  });

  describe('updateRole', () => {
    const base = {
      organizationId: 'org_1',
      targetUserId: 'user_target',
      actorUserId: 'user_actor',
    };

    it('GESTOR não pode promover a ADMIN (teto por rank)', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'MEMBER',
        userId: base.targetUserId,
      });
      await expect(
        service.updateRole({ ...base, newRole: 'ADMIN', actorRole: 'GESTOR' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('GESTOR pode promover MEMBER a GESTOR', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'MEMBER',
        userId: base.targetUserId,
      });
      await service.updateRole({ ...base, newRole: 'GESTOR', actorRole: 'GESTOR' });
      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'GESTOR' } }),
      );
    });

    it('ADMIN pode criar outro ADMIN', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'GESTOR',
        userId: base.targetUserId,
      });
      await service.updateRole({ ...base, newRole: 'ADMIN', actorRole: 'ADMIN' });
      expect(prisma.membership.update).toHaveBeenCalled();
    });

    it('ADMIN não pode rebaixar outro ADMIN (somente OWNER faz)', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'ADMIN',
        userId: base.targetUserId,
      });
      await expect(
        service.updateRole({ ...base, newRole: 'MEMBER', actorRole: 'ADMIN' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('OWNER pode rebaixar ADMIN', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'ADMIN',
        userId: base.targetUserId,
      });
      await service.updateRole({ ...base, newRole: 'MEMBER', actorRole: 'OWNER' });
      expect(prisma.membership.update).toHaveBeenCalled();
    });

    it('não rebaixa o último OWNER', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'OWNER',
        userId: base.targetUserId,
      });
      prisma.membership.count.mockResolvedValue(1);

      await expect(
        service.updateRole({ ...base, newRole: 'ADMIN', actorRole: 'OWNER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rebaixa OWNER se houver outros', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'OWNER',
        userId: base.targetUserId,
      });
      prisma.membership.count.mockResolvedValue(2);

      await service.updateRole({ ...base, newRole: 'ADMIN', actorRole: 'OWNER' });
      expect(prisma.membership.update).toHaveBeenCalled();
    });

    it('MEMBER não pode alterar papéis', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm',
        role: 'MEMBER',
        userId: base.targetUserId,
      });
      await expect(
        service.updateRole({ ...base, newRole: 'MEMBER', actorRole: 'MEMBER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404 se membro alvo não existir na Org', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(
        service.updateRole({ ...base, newRole: 'MEMBER', actorRole: 'OWNER' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    const base = {
      organizationId: 'org_1',
      targetUserId: 'user_target',
      actorUserId: 'user_actor',
    };

    it('não remove o último OWNER', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
      prisma.membership.count.mockResolvedValue(1);
      await expect(service.remove({ ...base, actorRole: 'OWNER' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('GESTOR não pode remover outros', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'MEMBER' });
      await expect(service.remove({ ...base, actorRole: 'GESTOR' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('GESTOR pode remover a si mesmo', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'GESTOR' });
      await service.remove({
        ...base,
        targetUserId: base.actorUserId,
        actorRole: 'GESTOR',
      });
      expect(prisma.membership.delete).toHaveBeenCalled();
    });

    it('ADMIN remove MEMBER', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'MEMBER' });
      await service.remove({ ...base, actorRole: 'ADMIN' });
      expect(prisma.membership.delete).toHaveBeenCalled();
    });
  });
});
