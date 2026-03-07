import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserConfig } from './entities/user-config.entity';
import { UserBalance } from './entities/user-balance.entity';
import { UpdateConfigDto, UpdateProfileDto } from './dto/update-config.dto';
import { ConsumeRecord } from '../billing/entities/consume-record.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserConfig)
    private readonly configRepo: Repository<UserConfig>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
    @InjectRepository(ConsumeRecord)
    private readonly consumeRepo: Repository<ConsumeRecord>,
    @InjectRepository(ReportUnlock)
    private readonly unlockRepo: Repository<ReportUnlock>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const balance = await this.balanceRepo.findOne({ where: { userId } });
    const stats = await this.getStats(userId);

    return {
      id: user.id,
      name: user.nickname || '微信用户',
      avatarUrl: user.avatarUrl,
      plan: user.membership === 'free' ? '基础版' : '高级版',
      membership: user.membership,
      membershipExpiresAt: user.membershipExpiresAt,
      balance: Number(balance?.balance || 0),
      stats,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async getConfig(userId: string) {
    const config = await this.configRepo.findOne({ where: { userId } });
    if (!config) throw new NotFoundException('用户配置不存在');
    return {
      industries: config.industries,
      likeThreshold: config.likeThreshold,
      timeRangeDays: config.timeRangeDays,
      recommendCount: config.recommendCount,
      pushTime: config.pushTime,
      pushEnabled: config.pushEnabled,
    };
  }

  async updateConfig(userId: string, dto: UpdateConfigDto) {
    await this.configRepo.update({ userId }, dto);
    return this.getConfig(userId);
  }

  async getBalance(userId: string) {
    const balance = await this.balanceRepo.findOne({ where: { userId } });
    if (!balance) throw new NotFoundException('余额记录不存在');
    return {
      balance: Number(balance.balance),
      totalRecharged: Number(balance.totalRecharged),
      totalConsumed: Number(balance.totalConsumed),
      frozenAmount: Number(balance.frozenAmount),
    };
  }

  async getStats(userId: string) {
    const analyses = await this.unlockRepo.count({ where: { userId } });

    return { analyses };
  }
}
