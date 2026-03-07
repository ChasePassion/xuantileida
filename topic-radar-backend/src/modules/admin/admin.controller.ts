import { Controller, Get, Post, Patch, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('管理后台')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========== 仪表盘 ==========

  @Get('dashboard')
  @ApiOperation({ summary: '管理后台仪表盘数据' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ========== 用户管理 ==========

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+(page || 1), +(limit || 20), search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: '设置用户角色' })
  async setUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.adminService.setUserRole(id, role);
  }

  @Patch('users/:id/membership')
  @ApiOperation({ summary: '设置用户会员' })
  async setUserMembership(
    @Param('id') id: string,
    @Body('membership') membership: string,
    @Body('days') days: number,
  ) {
    return this.adminService.setUserMembership(id, membership, days);
  }

  // ========== 订单管理 ==========

  @Get('orders')
  @ApiOperation({ summary: '订单列表' })
  async getOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(+(page || 1), +(limit || 20), status);
  }

  // ========== 兑换码管理 ==========

  @Get('codes')
  @ApiOperation({ summary: '兑换码列表' })
  async getCodes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getCodes(+(page || 1), +(limit || 20));
  }

  @Post('codes/generate')
  @ApiOperation({ summary: '批量生成兑换码' })
  async generateCodes(
    @Body('codeType') codeType: string,
    @Body('value') value: number,
    @Body('count') count: number,
    @Body('batchName') batchName?: string,
    @Body('maxUses') maxUses?: number,
    @Body('expiresInDays') expiresInDays?: number,
  ) {
    return this.adminService.generateCodes(
      codeType || 'vip_days',
      value,
      Math.min(count || 10, 500),
      batchName,
      maxUses || 1,
      expiresInDays,
    );
  }

  @Get('codes/records')
  @ApiOperation({ summary: '兑换记录' })
  async getRedemptionRecords(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getRedemptionRecords(+(page || 1), +(limit || 20));
  }

  // ========== 推荐数据 ==========

  @Get('referrals')
  @ApiOperation({ summary: '推荐激励统计' })
  async getReferralStats() {
    return this.adminService.getReferralStats();
  }
}
