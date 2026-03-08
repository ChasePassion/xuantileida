import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  // ========== Campaign Routes ==========

  @Get('active')
  @UseGuards(AuthGuard)
  async getActiveCampaigns(@CurrentUser('sub') userId: string) {
    return this.campaignService.getActiveCampaigns(userId);
  }

  @Post(':id/participate')
  @UseGuards(AuthGuard)
  async participateCampaign(
    @Param('id') campaignId: string,
    @CurrentUser('sub') userId: string,
    @Body('actionType') actionType?: string,
  ) {
    return this.campaignService.participateCampaign(campaignId, userId, actionType);
  }

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  async createCampaign(@Body() data: any) {
    return this.campaignService.createCampaign(data);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  async updateCampaign(@Param('id') id: string, @Body() data: any) {
    return this.campaignService.updateCampaign(id, data);
  }

  // ========== Achievement Routes ==========

  @Get('achievements')
  @UseGuards(AuthGuard)
  async getAchievements(@CurrentUser('sub') userId: string) {
    return this.campaignService.getAchievements(userId);
  }

  @Post('achievements/check')
  @UseGuards(AuthGuard)
  async checkAndUnlockAchievements(@CurrentUser('sub') userId: string) {
    return this.campaignService.checkAndUnlockAchievements(userId);
  }

  @Post('achievements/:id/share')
  @UseGuards(AuthGuard)
  async shareAchievement(
    @Param('id') achievementId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.campaignService.shareAchievement(achievementId, userId);
  }
}
