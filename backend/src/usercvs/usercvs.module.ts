import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserCV, UserCVSchema } from './schemas/usercv.schema';
import { UserCVsService } from './usercvs.service';
import { UserCVsController } from './usercvs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserCV.name, schema: UserCVSchema }]),
  ],
  controllers: [UserCVsController],
  providers: [UserCVsService],
  exports: [UserCVsService],
})
export class UserCVsModule {}
