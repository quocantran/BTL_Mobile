import { Controller, Get, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles, Role, ResponseMessage } from 'src/decorator/customize';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('mail')
@ApiTags('Mail Controller')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('send-job-notification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Send job notification')
  async sendJobNotification() {
    await this.mailService.sendJobNotification();
    return { message: 'Job notification sent successfully' };
  }
}
