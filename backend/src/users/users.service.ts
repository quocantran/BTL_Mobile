import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { IUser } from './users.interface';
import { OtpsService } from 'src/otps/otps.service';
import { MailService } from 'src/mail/mail.service';
import { Role } from 'src/decorator/customize';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @Inject(forwardRef(() => OtpsService))
    private readonly otpService: OtpsService,
    private readonly mailService: MailService,
  ) {}

  hashPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
  };

  checkPassword = (password: string, hash: string) => {
    return bcrypt.compareSync(password, hash);
  };


  generateOtp = (length: number) => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
  };

  async create(registerUserDto: RegisterUserDto) {
    const isExist = await this.userModel.findOne({
      email: registerUserDto.email,
    });
    if (isExist) {
      throw new BadRequestException('Email already exists');
    }
    registerUserDto.password = this.hashPassword(registerUserDto.password);

    // Default role is USER if not specified
    if (!registerUserDto.role) {
      registerUserDto.role = Role.USER;
    }

    const user = await this.userModel.create(registerUserDto);
    return {
      _id: user._id,
      createdAt: user.createdAt,
    };
  }

  async findAll(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    const totalRecord = (await this.userModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = qs.current ? +qs.current : 1;
    const users = await this.userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .select('-password -refreshToken')
      .populate(population);

    return {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: users,
    };
  }

  async findOneByEmail(email: string) {
    return await this.userModel.findOne({ email: email, isDeleted: false });
  }

  async findByCompanyId(companyId: string) {
    return await this.userModel.findOne({ 'company._id': companyId, isDeleted: false }).select('-password -refreshToken -createdBy -updatedBy -deletedBy _id');
  }

  async findAllByCompanyId(companyId: string) {
    return await this.userModel.find({ 'company._id': companyId, isDeleted: false }).select('-password -refreshToken -createdBy -updatedBy -deletedBy');
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findOne({ _id: id })
      .select('-password -refreshToken');

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async findUserByUsername(username: string) {
    return this.userModel.findOne({ email: username, isDeleted: false });
  }

  async findUserByName(name: string) {
    return await this.userModel.findOne({ name: name });
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    return await this.userModel.updateOne(
      { _id: id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    );
  }

  async updateUserCompany(userId: string, company: { _id: string; name: string }) {
    return await this.userModel.updateOne(
      { _id: userId },
      { company: company },
    );
  }

  async updateUserRole(userId: string, role: Role) {
    return await this.userModel.updateOne({ _id: userId }, { role });
  }

  async remove(id: string) {
    return await this.userModel.softDelete({ _id: id });
  }

  updateUserToken = async (refreshToken: string, _id: string) => {
    await this.userModel.updateOne({ _id }, { refreshToken });
  };

  updatePassword = async (id: string, updateUserDto: UpdateUserPasswordDto) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findOne({ _id: id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.checkPassword(updateUserDto.oldPassword, user.password)) {
      throw new BadRequestException('Current password is incorrect');
    }
    

    return await this.userModel.updateOne(
      { _id: id },
      { password: this.hashPassword(updateUserDto.newPassword) },
    );
  };

  async forgotPassword(token: string) {
    const user = await this.otpService.checkToken(token);

    if (!user) {
      throw new BadRequestException('Token not found!');
    }

    await this.otpService.remove(token);

    return await this.userModel.findOne({ email: user.email });
  }

  async countUser() {
    return await this.userModel.countDocuments();
  }

  // Search for HR users by name (only users with HR role that don't belong to any company yet)
  async searchHrsByName(name: string, excludeCompanyId?: string) {
    const query: any = {
      role: Role.HR,
      isDeleted: false,
    };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    // Exclude HRs that already belong to a company (unless it's the same company)
    if (excludeCompanyId) {
      query.$or = [
        { company: { $exists: false } },
        { company: null },
        { 'company._id': excludeCompanyId },
      ];
    } else {
      query.$or = [
        { company: { $exists: false } },
        { company: null },
      ];
    }

    const hrs = await this.userModel
      .find(query)
      .select('_id name email avatar')
      .limit(20);

    return hrs;
  }

  // Add HR to company
  async addHrToCompany(hrId: string, companyId: string, companyName: string) {
    const hr = await this.userModel.findOne({ _id: hrId, role: Role.HR, isDeleted: false });
    if (!hr) {
      throw new NotFoundException('HR not found or user is not an HR');
    }

    // Check if HR already belongs to another company
    if (hr.company && hr.company._id.toString() !== companyId) {
      throw new BadRequestException('HR đã thuộc về một công ty khác');
    }

    await this.userModel.updateOne(
      { _id: hrId },
      { company: { _id: companyId, name: companyName } },
    );

    return { message: 'Thêm HR vào công ty thành công' };
  }

  // Remove HR from company
  async removeHrFromCompany(hrId: string, companyId: string) {
    const hr = await this.userModel.findOne({ _id: hrId, role: Role.HR, isDeleted: false });
    if (!hr) {
      throw new NotFoundException('HR not found');
    }

    if (!hr.company || hr.company._id.toString() !== companyId) {
      throw new BadRequestException('HR không thuộc công ty này');
    }

    await this.userModel.updateOne(
      { _id: hrId },
      { $unset: { company: 1 } },
    );

    return { message: 'Xóa HR khỏi công ty thành công' };
  }
}
