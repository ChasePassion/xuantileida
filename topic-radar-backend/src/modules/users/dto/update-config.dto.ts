import { IsOptional, IsArray, IsNumber, IsBoolean, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiPropertyOptional({ description: '关注行业 slug 列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({ description: '点赞阈值' })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  likeThreshold?: number;

  @ApiPropertyOptional({ description: '时间范围（天）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  timeRangeDays?: number;

  @ApiPropertyOptional({ description: '每日推荐选题数' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(50)
  recommendCount?: number;

  @ApiPropertyOptional({ description: '推送时间 HH:mm:ss' })
  @IsOptional()
  @IsString()
  pushTime?: string;

  @ApiPropertyOptional({ description: '是否开启推送' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;
}
