import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly BATCH_SIZE = 20;

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

  async sendInterviewInvite(email: string, subject: string, content: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: subject || 'Thư mời phỏng vấn',
      html: content,
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

  // Run every 1 minute for testing (change to CronExpression.EVERY_DAY_AT_8AM for production)
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendJobNotificationCron() {
    this.logger.log('Starting job notification cron job...');

    try {
      // Get total count of active subscribers
      const totalSubscribers = await this.subscriberModel.countDocuments({
        isActive: true,
        isDeleted: false,
      });

      if (totalSubscribers === 0) {
        this.logger.log('No active subscribers found');
        return;
      }

      const totalPages = Math.ceil(totalSubscribers / this.BATCH_SIZE);
      this.logger.log(`Found ${totalSubscribers} subscribers, processing in ${totalPages} batches`);

      let emailsSent = 0;

      for (let page = 1; page <= totalPages; page++) {
        this.logger.log(`Processing batch ${page}/${totalPages}`);

        const subscribers = await this.subscriberModel
          .find({
            isActive: true,
            isDeleted: false,
          })
          .populate({
            path: 'skills',
            select: { _id: 1, name: 1 },
          })
          .skip((page - 1) * this.BATCH_SIZE)
          .limit(this.BATCH_SIZE);

        for (const subscriber of subscribers) {
          try {
            await this.sendJobNotificationToSubscriber(subscriber);
            emailsSent++;

            // Update lastEmailSentAt
            await this.subscriberModel.updateOne(
              { _id: subscriber._id },
              { lastEmailSentAt: new Date() },
            );
          } catch (error) {
            this.logger.error(`Failed to send email to ${subscriber.email}: ${error.message}`);
          }
        }

        // Small delay between batches to avoid overwhelming the mail server
        if (page < totalPages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.logger.log(`Job notification cron completed. Sent ${emailsSent} emails`);
    } catch (error) {
      this.logger.error(`Job notification cron failed: ${error.message}`);
    }
  }

  private async sendJobNotificationToSubscriber(subscriber: SubscriberDocument) {
    const skillNames = subscriber.skills.map((skill: any) => skill.name);

    if (skillNames.length === 0) {
      this.logger.debug(`Subscriber ${subscriber.email} has no skills, skipping`);
      return;
    }

    this.logger.debug(`Finding jobs for subscriber ${subscriber.email} with skills: ${skillNames.join(', ')}`);
    
    
    const now = new Date();
    const jobs = await this.jobModel
      .find({
        skills: { $in: ["FULLSTACK"] },
        isActive: true,
        isDeleted: false,
        endDate: { $gt: now },
        
        
      })
      .populate({
        path: 'company',
        select: { _id: 1, name: 1, logo: 1 },
      })
      .limit(10).lean().exec();
      
      this.logger.debug(`Found ${jobs.length} jobs for subscriber ${subscriber.email}, ${skillNames}`);
    if (jobs.length > 0) {
      this.logger.debug(`Sending ${jobs.length} jobs to ${subscriber.email}`);

      await this.mailerService.sendMail({
        to: subscriber.email,
        subject: `${jobs.length} việc làm mới phù hợp với kỹ năng của bạn`,
        template: 'job-notification',
        context: {
          jobs,
          subscriberEmail: subscriber.email,
          skillNames: skillNames.join(', '),
        },
      });
    }
  }

  // Keep the old method for manual triggering if needed
  async sendJobNotification() {
    const subscribers = await this.subscriberModel.find({
      isActive: true,
      isDeleted: false,
    }).populate({
      path: 'skills',
      select: { _id: 1, name: 1 },
    });

    for (const subscriber of subscribers) {
      // QUAN TRỌNG: Job.skills lưu dạng string[], không phải ObjectId
      const skillNames = subscriber.skills.map((skill: any) => skill.name);
      const skillRegexes = skillNames.map((name: string) => new RegExp(name, 'i'));

      const jobs = await this.jobModel.find({
        skills: { $in: skillRegexes }, // Query bằng skill names
        isActive: true,
        isDeleted: false,
      }).populate({
        path: 'company',
        select: { _id: 1, name: 1, logo: 1 },
      }).limit(10);

      if (jobs.length > 0) {
        await this.mailerService.sendMail({
          to: subscriber.email,
          subject: `${jobs.length} việc làm mới phù hợp với kỹ năng của bạn`,
          template: 'job-notification',
          context: {
            jobs,
            subscriberEmail: subscriber.email,
            skillNames: skillNames.join(', '),
          },
        });
      }
    }
  }
}
