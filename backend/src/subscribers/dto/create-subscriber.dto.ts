import { IsNotEmpty, IsArray } from 'class-validator';

export class CreateSubscriberDto {
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsArray()
  skills: string[];
}
