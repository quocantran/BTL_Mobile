import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsOptional()
  content?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  data?: Record<string, any>;
}
