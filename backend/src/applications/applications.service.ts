import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './schemas/application.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application.dto';
import mongoose from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { UserCVsService } from 'src/usercvs/usercvs.service';
import { Role } from 'src/decorator/customize';
import aqp from 'api-query-params';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: SoftDeleteModel<ApplicationDocument>,
    private readonly usersService: UsersService,
    private readonly userCVsService: UserCVsService,
  ) {}

  // User applies for a job with selected CV
  async create(createApplicationDto: CreateApplicationDto, user: IUser) {
    const { cvId, jobId, companyId, coverLetter } = createApplicationDto;

    // Check if CV exists and belongs to user
    const cv = await this.userCVsService.findOne(cvId, user);
    if (!cv) {
      throw new BadRequestException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // Check if already applied to this job
    const existingApplication = await this.applicationModel.findOne({
      userId: user._id,
      jobId,
      isDeleted: false,
    });

    if (existingApplication) {
      throw new BadRequestException('Bạn đã nộp đơn cho công việc này rồi');
    }

    const application = await this.applicationModel.create({
      cvId,
      userId: user._id,
      jobId,
      companyId,
      coverLetter,
      status: ApplicationStatus.PENDING,
      history: [
        {
          status: ApplicationStatus.PENDING,
          updatedAt: new Date(),
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      ],
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: application._id,
      createdAt: application.createdAt,
    };
  }

  // Get all applications (Admin/HR)
  async findAll(qs: any, user: IUser) {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const userInfo = await this.usersService.findOne(user._id);

    // HR can only see applications from their company
    if (userInfo.role === Role.HR && userInfo.company) {
      filter.companyId = userInfo.company._id;
    }

    const totalRecord = await this.applicationModel.countDocuments(filter);
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (parseInt(qs.current || '1') - 1) * limit;

    const applications = await this.applicationModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .sort(sort as any)
      .populate([
        { path: 'cvId', select: 'url title' },
        { path: 'userId', select: 'name email avatar' },
        { path: 'companyId', select: 'name logo' },
        { path: 'jobId', select: 'name salary level' },
      ]);

    return {
      meta: {
        current: parseInt(qs.current || '1'),
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: applications,
    };
  }

  // Get applications by job (for HR to review)
  async findByJob(jobId: string, qs: any, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Công việc không tồn tại');
    }

    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const skip = (parseInt(qs.current || '1') - 1) * limit;

    const filter: any = { jobId, isDeleted: false };

    if (qs.status) {
      filter.status = qs.status;
    }

    const totalRecord = await this.applicationModel.countDocuments(filter);
    const totalPage = Math.ceil(totalRecord / limit);

    const applications = await this.applicationModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'cvId', select: 'url title' },
        { path: 'userId', select: 'name email avatar phone' },
      ]);

    return {
      meta: {
        current: parseInt(qs.current || '1'),
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: applications,
    };
  }

  // Get user's own applications
  async findByUser(user: IUser) {
    const applications = await this.applicationModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'cvId', select: 'url title' },
        { path: 'companyId', select: 'name logo' },
        { path: 'jobId', select: 'name salary level location' },
      ]);

    return applications;
  }

  // Get one application
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel
      .findOne({ _id: id, isDeleted: false })
      .populate([
        { path: 'cvId', select: 'url title' },
        { path: 'userId', select: 'name email avatar phone' },
        { path: 'companyId', select: 'name logo' },
        { path: 'jobId', select: 'name salary level location' },
      ]);

    if (!application) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    return application;
  }

  // Update application status (HR/Admin)
  async updateStatus(
    id: string,
    updateDto: UpdateApplicationStatusDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!application) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const newHistory = {
      status: updateDto.status,
      updatedAt: new Date(),
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    return await this.applicationModel.findByIdAndUpdate(
      id,
      {
        status: updateDto.status,
        $push: { history: newHistory },
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
      { new: true },
    );
  }

  // Delete application (user can withdraw their application)
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!application) {
      throw new BadRequestException(
        'Đơn ứng tuyển không tồn tại hoặc không thuộc về bạn',
      );
    }

    // Only allow withdrawal if status is PENDING
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn ứng tuyển khi đang ở trạng thái chờ xử lý',
      );
    }

    await this.applicationModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.applicationModel.softDelete({ _id: id });
  }

  // Count applications by status for a company
  async countByCompany(companyId: string) {
    const stats = await this.applicationModel.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
  }

  // Count applications by job
  async countByJob(jobId: string) {
    return await this.applicationModel.countDocuments({
      jobId,
      isDeleted: false,
    });
  }
}
