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

  // Lock user account (Admin only)
  async lockUser(userId: string, reason: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Không thể khóa tài khoản Admin');
    }

    if (user.isLocked) {
      throw new BadRequestException('Tài khoản này đã bị khóa');
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: reason || 'Vi phạm quy định của hệ thống',
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Khóa tài khoản thành công' };
  }

  // Unlock user account (Admin only)
  async unlockUser(userId: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (!user.isLocked) {
      throw new BadRequestException('Tài khoản này chưa bị khóa');
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Mở khóa tài khoản thành công' };
  }

  // Approve HR account (Admin only)
  async approveHr(userId: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.role !== Role.HR) {
      throw new BadRequestException('Người dùng không phải HR');
    }

    if (user.isApproved) {
      throw new BadRequestException('Tài khoản HR đã được duyệt');
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        isApproved: true,
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Duyệt tài khoản HR thành công' };
  }

  // Get all admin users
  async findAllAdmins() {
    return await this.userModel
      .find({ role: Role.ADMIN, isDeleted: false })
      .select('-password -refreshToken');
  }

  // Get pending HR accounts (Admin only)
  async findPendingHrs() {
    return await this.userModel
      .find({ role: Role.HR, isApproved: false, isDeleted: false })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });
  }

  // Get all candidates (USER role only) for Admin
  async findAllCandidates(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    
    // Only get users with USER role
    filter.role = Role.USER;
    
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
}
