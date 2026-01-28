import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateOtpDto } from './dto/create-otp.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { UsersService } from 'src/users/users.service';
import crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class OtpsService {
  constructor(
    @InjectModel(Otp.name)
    private readonly otpModel: SoftDeleteModel<OtpDocument>,
    @Inject(forwardRef(() => UsersService)) private userService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async create(createOtpDto: CreateOtpDto) {
    const isExist = await this.userService.findUserByUsername(
      createOtpDto.email,
    );
    if (!isExist) {
      throw new BadRequestException('User not found');
    }

    const existOtp = await this.otpModel.findOne({ email: createOtpDto.email });

    if (existOtp) {
      throw new BadRequestException('OTP already exists');
    }

    const otpToken = this.generateToken();
    const newOtp = {
      token: otpToken,
      email: createOtpDto.email,
    };

    const result = await this.otpModel.create(newOtp);
    this.mailService.sendOtp(createOtpDto.email, otpToken.toString());
    return result;
  }

  generateToken() {
    const token = crypto.randomInt(0, Math.pow(2, 32));
    return token;
  }

  async checkToken(token: string) {
    const otp = await this.otpModel.findOne({ token: token }).lean().exec();
    if (!otp) {
      throw new BadRequestException('Token not found');
    }
    return otp;
  }

  async remove(token: string) {
    await this.otpModel.deleteOne({ token: token });
  }
}
