import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserCVDto {
  @IsNotEmpty({ message: 'Vui lòng tải CV lên!' })
  url: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
