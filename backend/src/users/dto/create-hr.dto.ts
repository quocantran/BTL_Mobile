import { IsNotEmpty } from "class-validator";
import { CreateUserDto } from "./create-user.dto";


export class CreateHrDto extends CreateUserDto {
    role: 'HR';

    @IsNotEmpty({ message: 'Company name cannot be empty' })
    companyName: string;

    @IsNotEmpty({ message: 'Company address cannot be empty' })
    companyAddress: string;

    @IsNotEmpty({ message: 'Company logo cannot be empty' })
    companyLogoUrl: string;

    @IsNotEmpty({ message: 'Company description cannot be empty' })
    companyDescription: string;
}