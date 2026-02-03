import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import ms from 'ms';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { IUser } from 'src/users/users.interface';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto, RegisterUserDto } from 'src/users/dto/create-user.dto';
import crypto from 'crypto';
import { Role } from 'src/decorator/customize';
import { CreateHrDto } from 'src/users/dto/create-hr.dto';
import { CompaniesService } from 'src/companies/companies.service';
import { Types } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationTargetType, NotificationType } from 'src/notifications/schemas/notification.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private companiesService: CompaniesService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findUserByUsername(username);
    if (user) {
      const isValid = this.usersService.checkPassword(pass, user.password);
      if (isValid) {
        return {
          ...user.toObject(),
          password: undefined,
        };
      }
    }
    return null;
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.forgotPassword(token);
    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    const hashedPassword = this.usersService.hashPassword(password);

    await this.userModel.updateOne(
      { _id: user._id },
      { password: hashedPassword },
    );

    return { message: 'Password reset successfully' };
  }

  generateRefreshToken = (payload: any) => {
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) / 1000,
    });

    return refreshToken;
  };

  async login(user: IUser, res: Response) {
    const { _id, name, email, role, age, gender, address, avatar } = user;

    const payload = {
      sub: 'token login',
      iss: 'from server',
      email,
      _id,
      role,
      name,
      age,
      gender,
      address,
      avatar
    };

    const refreshToken = this.generateRefreshToken(payload);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });

    await this.usersService.updateUserToken(refreshToken, _id);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    const userData = {
      _id,
      email,
      name,
      role,
      age: user.age,
      gender: user.gender,
      address: user.address,
      avatar: user.avatar,
    };

    if (user.role === Role.HR && user.company) {
      Object.assign(userData, { company: user.company });
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userData,
    };
  }

  async register(createUserDto: CreateUserDto) {
    const isExistEmail = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (isExistEmail) {
      throw new BadRequestException('Email already exists');
    }

    createUserDto.password = this.usersService.hashPassword(
      createUserDto.password,
    );

    const newUser = await this.userModel.create({
      ...createUserDto,
      role: Role.USER, // Default role for registration
    });

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  async googleLogin(req: any, res: Response) {
    const { user } = req;

    const isExistEmail = (await this.userModel.findOne({
      email: user.email,
    })) as unknown as IUser;

    let currentUser: IUser;

    const newPassword = crypto.randomBytes(20).toString('hex');
    const hashedPassword = this.usersService.hashPassword(newPassword);

    if (!isExistEmail) {
      currentUser = (await this.userModel.create({
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
        role: Role.USER,
        password: hashedPassword,
      })) as unknown as IUser;
    } else {
      await this.userModel.updateOne(
        { email: user.email },
        { $set: { name: user.firstName + ' ' + user.lastName } },
      );

      currentUser = {
        email: isExistEmail.email,
        _id: isExistEmail._id,
        role: isExistEmail.role,
        name: user.firstName + ' ' + user.lastName,
        age: isExistEmail.age,
        avatar: isExistEmail.avatar,
      };
    }

    const payload = {
      sub: 'token login',
      iss: 'from server',
      email: currentUser.email,
      _id: currentUser._id,
      role: currentUser.role,
      name: currentUser.name,
    };

    const refreshToken = this.generateRefreshToken(payload);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });

    await this.usersService.updateUserToken(refreshToken, currentUser._id);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    return {
      access_token: accessToken,
    };
  }

  async handleAccount(user: IUser) {
    const currUser = await this.userModel.findOne({ _id: user._id });

    return {
      user: {
        _id: currUser._id,
        email: currUser.email,
        name: currUser.name,
        role: currUser.role,
        company: currUser.company,
        age: currUser.age,
        address: currUser.address,
        gender: currUser.gender,
        avatar: currUser.avatar,
      },
    };
  }

  generateNewToken = async (refreshToken: string, res: Response) => {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload) {
        throw new BadRequestException('Invalid refresh token');
      }

      const user = await this.userModel.findOne({ refreshToken });

      if (user) {
        const { _id, name, email, role } = user;
        const newPayload = {
          sub: 'token login',
          iss: 'from server',
          email,
          _id,
          role,
          name,
        };

        const newRefreshToken = this.generateRefreshToken(newPayload);
        await this.usersService.updateUserToken(
          newRefreshToken,
          _id.toString(),
        );

        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          maxAge:
            ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
          sameSite: 'none',
          secure: true,
        });

        return {
          access_token: this.jwtService.sign(newPayload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn:
              ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
          }),
          user: {
            _id,
            email,
            name,
            role,
            avatar: user.avatar,
          }
        };
      }
    } catch (err) {
      throw new BadRequestException('Invalid refresh token');
    }
  };

  async registerHr(createHrDto: CreateHrDto) {
    const {
      companyName,
      companyDescription,
      companyLogoUrl,
      companyAddress,
      ...userDto
    } = createHrDto;
    userDto.role = Role.HR;
    const user = await this.usersService.create(userDto as RegisterUserDto);
    const companyData = {
      name: companyName,
      description: companyDescription,
      logo: companyLogoUrl,
      address: companyAddress,
      isActive: false,
    };
    const companiesService = this.companiesService;
    const company = await companiesService.createByHr(companyData, {
      _id: new Types.ObjectId(user._id).toString(),
      email: createHrDto.email,
      name: createHrDto.name || '',
      role: Role.HR,
      age: createHrDto.age || 0,
      address: createHrDto.address || '',
      gender: createHrDto.gender || '',

    });
    const updateUserDto = {
      company: {
        _id: company._id.toString(),
        name: companyName,
      },
    };
    await this.usersService.updateUserCompany(
      user._id.toString(),
      updateUserDto.company,
    );

    // Notify all admins with navigation target
    const admins = await this.userModel.find({
      role: Role.ADMIN,
      isDeleted: false,
    });
    if (admins && admins.length > 0) {
      const adminIds = admins.map((a) => a._id.toString());
      const content = `Có người đã đăng ký làm HR cho công ty ${companyName}, duyệt công ty ngay!`;
      await this.notificationsService.createBulk(
        adminIds,
        'Đăng ký HR mới',
        content,
        NotificationType.COMPANY,
        NotificationTargetType.COMPANY,
        company._id.toString(), // targetId
        { companyId: company._id.toString() },
      );
    }

    return {
      _id: user._id,
      createdAt: user.createdAt,
      company: companyData,
    };
  }

  logout = async (user: IUser, res: Response) => {
    await this.usersService.updateUserToken('', user._id);
    res.clearCookie('refresh_token');
    res.clearCookie('userId');
    return 'Logout success!';
  };
}
