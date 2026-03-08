import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PromoNote } from './entities/promo-note.entity';
import { PromoTemplate } from './entities/promo-template.entity';
import { UserPromoContent } from './entities/user-promo-content.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromoNote,
      PromoTemplate,
      UserPromoContent,
      User,
      UserBalance,
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
