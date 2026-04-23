import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('health')
@Public()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readyz')
  async readiness() {
    const checks: Record<string, 'ok' | 'error'> = { api: 'ok' };
    let allOk = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'error';
      allOk = false;
    }

    if (!allOk) {
      throw new ServiceUnavailableException({ status: 'not-ready', checks });
    }

    return {
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
