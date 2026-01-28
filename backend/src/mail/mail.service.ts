import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: SoftDeleteModel<SubscriberDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: SoftDeleteModel<JobDocument>,
  ) {}

  async sendOtp(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác thực OTP',
      template: 'otp',
      context: {
        otp,
      },
    });
  }

  async sendForgotPassword(email: string, token: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      template: 'forgot-password',
      context: {
        link: `${process.env.URL_FRONTEND}/reset-password?token=${token}`,
      },
    });
  }

  async sendWelcome(email: string, name: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Chào mừng bạn đến với hệ thống',
      template: 'welcome',
      context: {
        name,
      },
    });
  }

  async sendJobNotification() {
    const subscribers = await this.subscriberModel.find({
      isActive: true,
      isDeleted: false,
    }).populate({
      path: 'skills',
      select: { _id: 1, name: 1 },
    });

    for (const subscriber of subscribers) {
      const skillIds = subscriber.skills.map((skill: any) => skill._id);

      const jobs = await this.jobModel.find({
        skills: { $in: skillIds },
        isActive: true,
        isDeleted: false,
      }).populate({
        path: 'company',
        select: { _id: 1, name: 1, logo: 1 },
      }).limit(10);

      if (jobs.length > 0) {
        await this.mailerService.sendMail({
          to: subscriber.email,
          subject: 'Việc làm phù hợp với kỹ năng của bạn',
          template: 'job-notification',
          context: {
            jobs,
            subscriber,
          },
        });
      }
    }
  }
}
