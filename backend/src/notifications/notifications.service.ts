import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: SoftDeleteModel<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { userId, title, content, type, data } = createNotificationDto;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    const notification = await this.notificationModel.create({
      user: userId,
      title,
      content,
      type: type || NotificationType.SYSTEM,
      data,
    });

    return notification;
  }

  async createBulk(
    userIds: string[],
    title: string,
    content: string,
    type: NotificationType = NotificationType.SYSTEM,
    data?: Record<string, any>,
  ) {
    const notifications = userIds.map((userId) => ({
      user: new mongoose.Types.ObjectId(userId),
      title,
      content,
      type,
      data,
    }));

    return this.notificationModel.insertMany(notifications);
  }

  async findByUser(userId: string, page: number, limit: number) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    const notifications = await this.notificationModel
      .find({ user: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.notificationModel.countDocuments({
      user: userId,
      isDeleted: false,
    });

    const unreadCount = await this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });

    return {
      result: notifications,
      meta: {
        current: page,
        pageSize: limit,
        pages: Math.ceil(total / limit),
        total,
        unreadCount,
      },
    };
  }

  async markAsRead(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Notification not found');
    }

    return this.notificationModel.findOneAndUpdate(
      { _id: id, user: user._id },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(user: IUser) {
    return this.notificationModel.updateMany(
      { user: user._id, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Notification not found');
    }

    return this.notificationModel.softDelete({
      _id: new mongoose.Types.ObjectId(id),
      user: new mongoose.Types.ObjectId(user._id),
    });
  }

  async getUnreadCount(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    return this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });
  }
}
