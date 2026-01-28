import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import mongoose from 'mongoose';
import { Type } from 'class-transformer';
import { IsObject, ValidateNested, IsNotEmpty } from 'class-validator';
import { Role } from 'src/decorator/customize';

class Company {
  @IsOptional()
  _id: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  name: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  name?: string;

  @IsOptional()
  age?: number;

  @IsOptional()
  gender?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Company)
  company?: Company;
}

export class UpdateUserPasswordDto {
  @IsNotEmpty()
  oldPassword: string;

  @IsNotEmpty()
  newPassword: string;

}
