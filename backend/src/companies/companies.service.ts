import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { FollowCompanyDto } from './dto/follow-company.dto';
import { RedisService } from 'src/redis/redis.service';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/decorator/customize';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { NotificationType } from 'src/notifications/schemas/notification.schema';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private companyModel: SoftDeleteModel<CompanyDocument>,

    private readonly redisService: RedisService,

    private readonly notificationService: NotificationsService,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @InjectModel(Job.name)
    private jobModel: Model<JobDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, user: IUser) {
    const companyExist = await this.companyModel.findOne({
      name: createCompanyDto.name,
    });

    if (companyExist) throw new BadRequestException('Company already exist');

    const newCompany = await this.companyModel.create({
      ...createCompanyDto,
      isActive: true,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.redisService.invalidateCompaniesCache();

    return newCompany;
  }

  async getAll() {
    return await this.companyModel.find({ isActive: true }).lean().exec();
  }

  async getAllByAdmin(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const totalRecord = (await this.companyModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current;

    const companies = await this.companyModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate(population);

    return {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: companies,
    };
  }

  async findAll(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    delete filter.isActive;

    const cacheKey = 'companies-' + JSON.stringify(qs);
    const cacheData = await this.redisService.getValue<string>(cacheKey);

    // if (cacheData) {
    //   return JSON.parse(cacheData as string);
    // }

    // Extract userId for checking follow status
    const userId = filter.userId;
    delete filter.userId;

    const totalRecord = (
      await this.companyModel.find({ ...filter, isActive: true })
    ).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current;

    const companies = await this.companyModel
      .find({ ...filter, isActive: true })
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate(population);

    // Add isFollowed field for each company
    const companiesWithJobCount = await Promise.all(
      companies.map(async (company) => {
        const companyObj = company.toObject() as any;
        companyObj.isFollowed = userId
          ? company.usersFollow?.some(
              (followerId) => followerId.toString() === userId,
            )
          : false;

        // Fetch job count for the company from jobs collection
        const jobCount = await this.jobModel.countDocuments({
          'company._id': company._id,
        });
        companyObj.jobCount = jobCount;

        return companyObj;
      }),
    );

    const response = {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: companiesWithJobCount,
    };

    await this.redisService.setValue(cacheKey, JSON.stringify(response), 60);

    return response;
  }

  async followCompany(company: FollowCompanyDto, user: IUser) {
    const { companyId } = company;

    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const userFollow = companyExist.usersFollow.some(
      (item) => item.toString() === user._id.toString(),
    );

    if (userFollow){
      throw new BadRequestException('User already follow company');
    }
    

    await this.companyModel
      .findByIdAndUpdate(
        company.companyId,
        { $addToSet: { usersFollow: user._id.toString() } },
        { new: true },
      )
      .exec();

    //send notification to hr when user follow company
    const hrInCompany = await this.usersService.findByCompanyId(companyId);
    const notiObj = {
      userId: hrInCompany._id.toString(),
      title: 'Công ty của bạn có người theo dõi mới',
      content: `Người dùng ${user.name} đã theo dõi công ty của bạn.`,
      type: NotificationType.COMPANY,
      data: { companyId },
    };
    this.notificationService.create(notiObj as CreateNotificationDto);

    return user._id;
  }

  async verifyCompany(companyId: string) {
    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const isAlreadyActive = companyExist.isActive;

    const updatedCompany = await this.companyModel.updateOne(
      { _id: companyId },
      { isActive: !isAlreadyActive },
    );
    await this.redisService.invalidateCompaniesCache();

    const hrInCompany = await this.usersService.findByCompanyId(companyId);

    const notiObj = {
      userId: hrInCompany._id.toString(),
      title: isAlreadyActive
        ? 'Công ty của bạn đã bị khóa'
        : 'Công ty của bạn đã được duyệt',
      content: isAlreadyActive
        ? 'Công ty của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ để biết thêm chi tiết.'
        : 'Công ty của bạn đã được duyệt bởi quản trị viên. Bây giờ bạn có thể đăng tuyển dụng',
      type: NotificationType.COMPANY,
      data: { companyId },
    };

    await this.notificationService.create(notiObj as CreateNotificationDto);
    return updatedCompany;
  }

  async createByHr(createCompanyDto: CreateCompanyDto, user: IUser) {
    const companyExist = await this.companyModel.findOne({
      name: createCompanyDto.name,
    });

    if (companyExist) throw new BadRequestException('Company already exist');

    const newCompany = await this.companyModel.create({
      ...createCompanyDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.redisService.invalidateCompaniesCache();

    return newCompany;
  }

  async unfollowCompany(company: FollowCompanyDto, user: IUser) {
    const { companyId } = company;

    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const userFollow = companyExist.usersFollow.some(
      (item) => item.toString() === user._id.toString(),
    );

    if (!userFollow) throw new BadRequestException('User not follow company');

    await this.companyModel
      .findByIdAndUpdate(
        company.companyId,
        { $pull: { usersFollow: user._id.toString() } },
        { new: true },
      )
      .exec();

    return user._id;
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.companyModel.findOne({ _id: id });

    if (!company) throw new NotFoundException('Company not found');

    const hrInCompany = await this.usersService.findByCompanyId(id);

    const companyObj = company.toObject() as any;
    companyObj.hr = hrInCompany;

    return companyObj;
  }

  async findWithUserFollow(companyId: string) {
    return this.companyModel.findOne({ _id: companyId }).populate({
      path: 'usersFollow',
      select: {
        email: 1,
        name: 1,
      },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (
      userInDb.role !== Role.ADMIN &&
      userInDb.company &&
      userInDb.company._id.toString() !== id
    ) {
      throw new BadRequestException(
        'You are not allowed to update this company',
      );
    }

    const updatedCompany = await this.companyModel.updateOne(
      { _id: id },
      {
        ...updateCompanyDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.redisService.invalidateCompaniesCache();
    return updatedCompany;
  }

  async remove(id: string, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (userInDb.role !== Role.ADMIN) {
      if (userInDb.company && userInDb.company._id.toString() !== id) {
        throw new BadRequestException(
          'You are not allowed to delete this company',
        );
      }
    }

    const company = await this.companyModel.findOne({ _id: id });
    if (!company) throw new BadRequestException('Company not found');

    await this.companyModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.redisService.invalidateCompaniesCache();

    return this.companyModel.softDelete({ _id: id });
  }

  async countCompanies() {
    return this.companyModel.countDocuments();
  }
}
