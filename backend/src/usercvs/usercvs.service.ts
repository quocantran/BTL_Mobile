import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserCV, UserCVDocument } from './schemas/usercv.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateUserCVDto } from './dto/create-usercv.dto';
import { UpdateUserCVDto } from './dto/update-usercv.dto';
import mongoose from 'mongoose';

@Injectable()
export class UserCVsService {
  constructor(
    @InjectModel(UserCV.name)
    private readonly userCVModel: SoftDeleteModel<UserCVDocument>,
  ) {}

  // Upload a new CV
  async create(createUserCVDto: CreateUserCVDto, user: IUser) {
    // If this is the first CV or marked as primary, handle primary logic
    const existingCVs = await this.userCVModel.countDocuments({
      userId: user._id,
      isDeleted: false,
    });

    const isPrimary = existingCVs === 0 || createUserCVDto.isPrimary === true;

    // If setting as primary, remove primary from others
    if (isPrimary) {
      await this.userCVModel.updateMany(
        { userId: user._id, isPrimary: true },
        { isPrimary: false },
      );
    }

    const newCV = await this.userCVModel.create({
      ...createUserCVDto,
      userId: user._id,
      isPrimary,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: newCV._id,
      url: newCV.url,
      title: newCV.title,
      isPrimary: newCV.isPrimary,
      createdAt: newCV.createdAt,
    };
  }

  // Get all CVs of current user (primary first)
  async findByUser(user: IUser) {
    const cvs = await this.userCVModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ isPrimary: -1, createdAt: -1 })
      .select('_id url title description isPrimary createdAt updatedAt');

    return cvs;
  }

  // Get CVs for job application form (primary first)
  async getCVsForApplication(user: IUser) {
    const cvs = await this.userCVModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ isPrimary: -1, createdAt: -1 })
      .select('_id url title isPrimary');

    return cvs;
  }

  // Get one CV by ID
  async findOne(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.userCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    return cv;
  }

  // Update CV info (title, description)
  async update(id: string, updateUserCVDto: UpdateUserCVDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.userCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new BadRequestException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // If setting as primary
    if (updateUserCVDto.isPrimary === true) {
      await this.userCVModel.updateMany(
        { userId: user._id, isPrimary: true },
        { isPrimary: false },
      );
    }

    return await this.userCVModel.findByIdAndUpdate(
      id,
      {
        ...updateUserCVDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
      { new: true },
    );
  }

  // Set a CV as primary
  async setPrimary(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.userCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new BadRequestException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // Remove primary from all other CVs
    await this.userCVModel.updateMany(
      { userId: user._id, isPrimary: true },
      { isPrimary: false },
    );

    // Set this CV as primary
    await this.userCVModel.updateOne(
      { _id: id },
      {
        isPrimary: true,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return { message: 'Đã đặt làm CV chính' };
  }

  // Delete a CV
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.userCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new BadRequestException('CV không tồn tại hoặc không thuộc về bạn');
    }

    await this.userCVModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    const result = await this.userCVModel.softDelete({ _id: id });

    // If deleted CV was primary, set the next CV as primary
    if (cv.isPrimary) {
      const nextCV = await this.userCVModel.findOne({
        userId: user._id,
        isDeleted: false,
      }).sort({ createdAt: -1 });

      if (nextCV) {
        await this.userCVModel.updateOne(
          { _id: nextCV._id },
          { isPrimary: true },
        );
      }
    }

    return result;
  }

  // Get primary CV of a user
  async getPrimaryCV(userId: string) {
    return await this.userCVModel.findOne({
      userId,
      isPrimary: true,
      isDeleted: false,
    });
  }

  // Count CVs by user
  async countByUser(userId: string) {
    return await this.userCVModel.countDocuments({
      userId,
      isDeleted: false,
    });
  }
}
