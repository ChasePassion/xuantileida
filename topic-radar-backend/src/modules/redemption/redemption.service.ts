import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RedemptionCode } from './entities/redemption-code.entity';
import { RedemptionRecord } from './entities/redemption-record.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RedemptionService {
  private readonly logger = new Logger(RedemptionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RedemptionCode)
    private readonly codeRepo: Repository<RedemptionCode>,
    @InjectRepository(RedemptionRecord)
    private readonly recordRepo: Repository<RedemptionRecord>,
  ) {}

  /**
   * 兑换码兑换
   */
  async redeem(userId: string, codeStr: string) {
    const code = codeStr.trim().toUpperCase();

    return await this.dataSource.transaction(async (manager) => {
      const redemptionCode = await manager.findOne(RedemptionCode, {
        where: { code, isActive: true },
      });

      if (!redemptionCode) {
        throw new BadRequestException('兑换码无效或不存在');
      }

      // 检查过期
      if (redemptionCode.expiresAt && new Date(redemptionCode.expiresAt) < new Date()) {
        throw new BadRequestException('兑换码已过期');
      }

      // 检查使用次数
      if (redemptionCode.usedCount >= redemptionCode.maxUses) {
        throw new BadRequestException('兑换码已被使用完');
      }

      // 检查用户是否已用过同类型码
      const used = await manager.findOne(RedemptionRecord, {
        where: { userId, codeType: redemptionCode.codeType },
      });
      if (used) {
        throw new BadRequestException('您已使用过同类型兑换码');
      }

      // 更新使用次数
      redemptionCode.usedCount += 1;
      if (redemptionCode.usedCount >= redemptionCode.maxUses) {
        redemptionCode.isActive = false;
      }
      await manager.save(redemptionCode);

      // 记录兑换
      const record = manager.create(RedemptionRecord, {
        userId,
        codeId: redemptionCode.id,
        code: redemptionCode.code,
        codeType: redemptionCode.codeType,
        value: redemptionCode.value,
      });
      await manager.save(record);

      // 发放奖励 - VIP天数
      if (redemptionCode.codeType === 'vip_days') {
        const user = await manager.findOne(User, { where: { id: userId } });
        if (user) {
          const now = new Date();
          const currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
            ? new Date(user.membershipExpiresAt)
            : now;
          user.membership = 'premium';
          user.membershipExpiresAt = new Date(currentExpiry.getTime() + redemptionCode.value * 86400000);
          await manager.save(user);
        }
      }

      this.logger.log(`用户 ${userId} 兑换码 ${code} 成功: ${redemptionCode.codeType} +${redemptionCode.value}`);

      return {
        codeType: redemptionCode.codeType,
        value: redemptionCode.value,
        message: redemptionCode.codeType === 'vip_days'
          ? `成功兑换${redemptionCode.value}天VIP会员`
          : `兑换成功`,
      };
    });
  }

  /**
   * 批量生成兑换码（管理接口）
   */
  async generateCodes(options: {
    codeType: string;
    value: number;
    count: number;
    maxUses?: number;
    expiresAt?: Date;
    batchName?: string;
  }) {
    const codes: RedemptionCode[] = [];
    for (let i = 0; i < options.count; i++) {
      const code = this.generateRandomCode();
      codes.push(
        this.codeRepo.create({
          code,
          codeType: options.codeType,
          value: options.value,
          maxUses: options.maxUses || 1,
          expiresAt: options.expiresAt,
          batchName: options.batchName,
        }),
      );
    }
    await this.codeRepo.save(codes);
    return {
      count: codes.length,
      codes: codes.map((c) => c.code),
    };
  }

  /**
   * 获取用户兑换记录
   */
  async getMyRecords(userId: string) {
    return this.recordRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TR';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
