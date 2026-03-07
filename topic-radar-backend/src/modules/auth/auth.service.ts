import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { UserConfig } from '../users/entities/user-config.entity';
import { UserBalance } from '../users/entities/user-balance.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async wechatLogin(code: string) {
    // 调用微信 API 换取 openid
    const openid = await this.getOpenidFromWechat(code);

    // 查找或创建用户
    let user = await this.userRepository.findOne({
      where: { openid, isDeleted: false },
    });

    let isNewUser = false;

    if (!user) {
      user = await this.createNewUser(openid);
      isNewUser = true;
    }

    // 生成 JWT
    const token = await this.jwtService.signAsync({
      sub: user.id,
      openid: user.openid,
      membership: user.membership,
      membershipExpiresAt: user.membershipExpiresAt,
    });

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt,
      },
      isNewUser,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      openid: user.openid,
      membership: user.membership,
      membershipExpiresAt: user.membershipExpiresAt,
    });

    return { token };
  }

  private async getOpenidFromWechat(code: string): Promise<string> {
    const appId = this.configService.get<string>('wechat.appId');
    const secret = this.configService.get<string>('wechat.secret');

    // 开发环境下使用 mock openid
    if (process.env.NODE_ENV === 'development' && code.startsWith('dev_')) {
      return `dev_openid_${code.replace('dev_', '')}`;
    }

    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        this.logger.error(`微信登录失败: ${data.errmsg}`);
        throw new UnauthorizedException('微信登录失败');
      }

      return data.openid;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('调用微信API异常', error);
      throw new UnauthorizedException('微信登录服务异常');
    }
  }

  private async createNewUser(openid: string): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      // 创建用户
      const user = manager.create(User, {
        openid,
        membership: 'free',
      });
      await manager.save(user);

      // 创建默认配置
      const config = manager.create(UserConfig, {
        userId: user.id,
        industries: [],
        likeThreshold: 100000,
        timeRangeDays: 7,
        recommendCount: 30,
      });
      await manager.save(config);

      // 创建账户余额（新用户赠送额度后续可通过赠送消费记录实现）
      const balance = manager.create(UserBalance, {
        userId: user.id,
        balance: 0,
      });
      await manager.save(balance);

      this.logger.log(`新用户创建成功: ${user.id}`);
      return user;
    });
  }
}
