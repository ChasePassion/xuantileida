import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateConfigDto, UpdateProfileDto } from './dto/update-config.dto';

@ApiTags('用户')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户资料' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新用户资料' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('config')
  @ApiOperation({ summary: '获取选题配置' })
  async getConfig(@CurrentUser('sub') userId: string) {
    return this.usersService.getConfig(userId);
  }

  @Patch('config')
  @ApiOperation({ summary: '更新选题配置' })
  async updateConfig(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.usersService.updateConfig(userId, dto);
  }

  @Get('balance')
  @ApiOperation({ summary: '获取余额详情' })
  async getBalance(@CurrentUser('sub') userId: string) {
    return this.usersService.getBalance(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取使用统计' })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.usersService.getStats(userId);
  }
}
