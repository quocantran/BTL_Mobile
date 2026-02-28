import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnlineCV, OnlineCVDocument } from './schemas/online-cv.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateOnlineCVDto } from './dto/create-online-cv.dto';
import { UpdateOnlineCVDto } from './dto/update-online-cv.dto';
import mongoose from 'mongoose';
import { FilesService } from 'src/files/files.service';
import { UserCVsService } from 'src/usercvs/usercvs.service';

// Dynamic import for puppeteer
let puppeteer: any;

@Injectable()
export class OnlineCVsService {
  constructor(
    @InjectModel(OnlineCV.name)
    private readonly onlineCVModel: SoftDeleteModel<OnlineCVDocument>,
    private readonly filesService: FilesService,
    private readonly userCVsService: UserCVsService,
  ) {
    this.loadPuppeteer();
  }

  private async loadPuppeteer() {
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      console.warn('Puppeteer not available for PDF generation');
    }
  }

  // Create a new online CV
  async create(createOnlineCVDto: CreateOnlineCVDto, user: IUser) {
    const newCV = await this.onlineCVModel.create({
      ...createOnlineCVDto,
      userId: user._id,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: newCV._id,
      templateType: newCV.templateType,
      fullName: newCV.fullName,
      createdAt: newCV.createdAt,
    };
  }

  // Get all online CVs of current user
  async findByUser(user: IUser) {
    const cvs = await this.onlineCVModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .select('-createdBy -updatedBy -deletedBy');
    Logger.log(`Found ${cvs.length} online CV(s) for user ${user.email}`);
    return cvs;
  }

  // Get one online CV by ID
  async findOne(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    return cv;
  }

  // Update online CV
  async update(id: string, updateOnlineCVDto: UpdateOnlineCVDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    await this.onlineCVModel.updateOne(
      { _id: id },
      {
        ...updateOnlineCVDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.findOne(id, user);
  }

  // Delete online CV
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // Prevent deletion of exported online CVs (UserCVs reference them via onlineCvId)
    if (cv.pdfUrl) {
      throw new BadRequestException('Không thể xóa CV đã được xuất PDF. Vui lòng xóa bản PDF trước.');
    }

    await this.onlineCVModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.onlineCVModel.softDelete({ _id: id });
  }

  // Generate HTML for Template 1 (Classic vertical layout)
  private generateTemplate1HTML(cv: OnlineCVDocument): string {
    const educationHTML = cv.education?.map(edu => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${edu.schoolName || ''}</span>
          <span class="entry-date">${edu.startDate || ''} - ${edu.endDate || ''}</span>
        </div>
        <div class="entry-subtitle">${edu.major || ''}</div>
        <div class="entry-description">${edu.description || ''}</div>
      </div>
    `).join('') || '';

    const workExpHTML = cv.workExperience?.map(exp => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${exp.companyName || ''}</span>
          <span class="entry-date">${exp.startDate || ''} - ${exp.endDate || ''}</span>
        </div>
        <div class="entry-subtitle">${exp.position || ''}</div>
        <div class="entry-description">${exp.description || ''}</div>
      </div>
    `).join('') || '';

    const skillsHTML = cv.skills?.map(skill => `
      <div class="skill-item">
        <span class="skill-name">${skill.name || ''}</span>
        <span class="skill-desc">${skill.description || ''}</span>
      </div>
    `).join('') || '';

    const activitiesHTML = cv.activities?.map(act => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${act.organizationName || ''}</span>
          <span class="entry-date">${act.startDate || ''} - ${act.endDate || ''}</span>
        </div>
        <div class="entry-subtitle">${act.position || ''}</div>
        <div class="entry-description">${act.description || ''}</div>
      </div>
    `).join('') || '';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${cv.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #333; background: white; }
    .cv-container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .name { font-size: 28pt; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
    .position { font-size: 14pt; font-style: italic; color: #555; margin-bottom: 12px; }
    .contact-info { font-size: 10pt; display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; }
    .contact-item { display: flex; align-items: center; gap: 5px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 15px; }
    .objective { text-align: justify; font-style: italic; }
    .entry { margin-bottom: 15px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-title { font-weight: bold; }
    .entry-date { font-style: italic; color: #666; font-size: 10pt; }
    .entry-subtitle { font-style: italic; color: #555; margin: 3px 0; }
    .entry-description { text-align: justify; margin-top: 5px; }
    .skill-item { display: flex; margin-bottom: 8px; }
    .skill-name { font-weight: bold; min-width: 150px; }
    .skill-desc { color: #555; }
  </style>
</head>
<body>
  <div class="cv-container">
    <div class="header">
      <div class="name">${cv.fullName || ''}</div>
      <div class="position">${cv.position || ''}</div>
      <div class="contact-info">
        ${cv.phone ? `<span class="contact-item">📞 ${cv.phone}</span>` : ''}
        ${cv.email ? `<span class="contact-item">✉️ ${cv.email}</span>` : ''}
        ${cv.link ? `<span class="contact-item">🔗 ${cv.link}</span>` : ''}
        ${cv.address ? `<span class="contact-item">📍 ${cv.address}</span>` : ''}
      </div>
    </div>

    ${cv.careerObjective ? `
    <div class="section">
      <div class="section-title">MỤC TIÊU NGHỀ NGHIỆP</div>
      <div class="objective">${cv.careerObjective}</div>
    </div>
    ` : ''}

    ${cv.education?.length ? `
    <div class="section">
      <div class="section-title">HỌC VẤN</div>
      ${educationHTML}
    </div>
    ` : ''}

    ${cv.workExperience?.length ? `
    <div class="section">
      <div class="section-title">KINH NGHIỆM LÀM VIỆC</div>
      ${workExpHTML}
    </div>
    ` : ''}

    ${cv.skills?.length ? `
    <div class="section">
      <div class="section-title">KỸ NĂNG</div>
      ${skillsHTML}
    </div>
    ` : ''}

    ${cv.activities?.length ? `
    <div class="section">
      <div class="section-title">HOẠT ĐỘNG</div>
      ${activitiesHTML}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  // Generate HTML for Template 2 (Modern two-column layout)
  private generateTemplate2HTML(cv: OnlineCVDocument): string {
    const educationHTML = cv.education?.map(edu => `
      <div class="entry">
        <div class="entry-date">${edu.startDate || ''} - ${edu.endDate || ''}</div>
        <div class="entry-major">${edu.major || ''}</div>
        <div class="entry-title">${edu.schoolName || ''}</div>
        <div class="entry-description">${edu.description || ''}</div>
      </div>
    `).join('') || '';

    const workExpHTML = cv.workExperience?.map(exp => `
      <div class="timeline-entry">
        <div class="timeline-left">
          <div class="company">${exp.companyName || ''}</div>
          <div class="date">${exp.startDate || ''} - ${exp.endDate || ''}</div>
        </div>
        <div class="timeline-dot"></div>
        <div class="timeline-right">
          <div class="position">${exp.position || ''}</div>
          <div class="description">${exp.description || ''}</div>
        </div>
      </div>
    `).join('') || '';

    const skillsHTML = cv.skills?.map(skill => `
      <div class="skill-item">${skill.name || ''}</div>
    `).join('') || '';

    const certificatesHTML = cv.certificates?.map(cert => `
      <div class="cert-item">
        <div class="cert-date">${cert.date || ''}</div>
        <div class="cert-name">${cert.name || ''}</div>
      </div>
    `).join('') || '';

    const awardsHTML = cv.awards?.map(award => `
      <div class="award-item">
        <div class="award-date">${award.date || ''}</div>
        <div class="award-name">${award.name || ''}</div>
      </div>
    `).join('') || '';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${cv.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; background: white; }
    .cv-container { max-width: 850px; margin: 0 auto; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .header-left { flex: 1; }
    .name { font-size: 24pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .position { font-size: 12pt; color: #666; }
    .header-right { flex-shrink: 0; }
    .contact-item { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-bottom: 5px; font-size: 10pt; white-space: nowrap; }
    .contact-icon { font-size: 10pt; }
    .main-content { display: flex; gap: 30px; }
    .left-column { flex: 1; }
    .right-column { flex: 1; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid #333; }
    .objective { text-align: justify; font-size: 10pt; color: #555; }
    .timeline-entry { display: flex; gap: 15px; margin-bottom: 15px; }
    .timeline-left { flex: 0 0 100px; font-size: 9pt; }
    .timeline-dot { width: 8px; height: 8px; background: #333; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .timeline-right { flex: 1; }
    .company { font-weight: bold; }
    .date { color: #666; font-size: 9pt; }
    .position { font-style: italic; color: #555; }
    .description { font-size: 10pt; margin-top: 5px; }
    .entry { margin-bottom: 15px; }
    .entry-date { font-size: 9pt; color: #666; }
    .entry-major { font-style: italic; color: #555; }
    .entry-title { font-weight: bold; }
    .entry-description { font-size: 10pt; margin-top: 3px; }
    .skill-item { padding: 5px 0; border-bottom: 1px dotted #ddd; font-size: 10pt; }
    .cert-item, .award-item { margin-bottom: 10px; }
    .cert-date, .award-date { font-size: 9pt; color: #666; }
    .cert-name, .award-name { font-weight: 500; }
  </style>
</head>
<body>
  <div class="cv-container">
    <div class="header">
      <div class="header-left">
        <div class="name">${cv.fullName || ''}</div>
        <div class="position">${cv.position || ''}</div>
      </div>
      <div class="header-right">
        ${cv.phone ? `<div class="contact-item"><span class="contact-icon">📞Số điện thoại: </span>${cv.phone}</div>` : ''}
        ${cv.email ? `<div class="contact-item"><span class="contact-icon">✉️Email: </span>${cv.email}</div>` : ''}
        ${cv.address ? `<div class="contact-item"><span class="contact-icon">📍Địa chỉ hiện tại: </span>${cv.address}</div>` : ''}
      </div>
    </div>

    ${cv.careerObjective ? `
    <div class="section">
      <div class="section-title">MỤC TIÊU NGHỀ NGHIỆP</div>
      <div class="objective">${cv.careerObjective}</div>
    </div>
    ` : ''}

    ${cv.workExperience?.length ? `
    <div class="section">
      <div class="section-title">KINH NGHIỆM LÀM VIỆC</div>
      ${workExpHTML}
    </div>
    ` : ''}

    <div class="main-content">
      <div class="left-column">
        ${cv.education?.length ? `
        <div class="section">
          <div class="section-title">HỌC VẤN</div>
          ${educationHTML}
        </div>
        ` : ''}

        ${cv.certificates?.length ? `
        <div class="section">
          <div class="section-title">CHỨNG CHỈ</div>
          ${certificatesHTML}
        </div>
        ` : ''}
      </div>

      <div class="right-column">
        ${cv.skills?.length ? `
        <div class="section">
          <div class="section-title">KỸ NĂNG</div>
          ${skillsHTML}
        </div>
        ` : ''}

        ${cv.awards?.length ? `
        <div class="section">
          <div class="section-title">DANH HIỆU VÀ GIẢI THƯỞNG</div>
          ${awardsHTML}
        </div>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // Export CV to PDF and save to user's CV list
  async exportToPdf(id: string, user: IUser) {
    const cv = await this.findOne(id, user);

    if (!puppeteer) {
      throw new BadRequestException('PDF generation is not available');
    }

    try {
      // Generate HTML based on template type
      const html = cv.templateType === 'template1'
        ? this.generateTemplate1HTML(cv)
        : this.generateTemplate2HTML(cv);

      // Launch browser and create PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      
      await browser.close();

      // Upload PDF to Cloudinary
      const uploadResult = await this.filesService.uploadBuffer(
        pdfBuffer,
        `cv_${cv._id}_${Date.now()}.pdf`,
        'application/pdf'
      );

      // Update online CV with PDF URL
      await this.onlineCVModel.updateOne(
        { _id: id },
        { pdfUrl: uploadResult.url },
      );

      // Build parsedText and structured data from online CV
      const parsedTextParts = [
        cv.fullName ? `Họ tên: ${cv.fullName}` : '',
        cv.position ? `Vị trí: ${cv.position}` : '',
        cv.phone ? `Điện thoại: ${cv.phone}` : '',
        cv.email ? `Email: ${cv.email}` : '',
        cv.address ? `Địa chỉ: ${cv.address}` : '',
        cv.careerObjective ? `Mục tiêu nghề nghiệp: ${cv.careerObjective}` : '',
        cv.skills?.length ? `Kỹ năng: ${cv.skills.map((s: any) => s.name + (s.description ? ` (${s.description})` : '')).join(', ')}` : '',
        cv.education?.length ? `Học vấn: ${cv.education.map((e: any) => `${e.schoolName} - ${e.major} (${e.startDate || ''} - ${e.endDate || ''})`).join('. ')}` : '',
        cv.workExperience?.length ? `Kinh nghiệm: ${cv.workExperience.map((w: any) => `${w.companyName} - ${w.position} (${w.startDate || ''} - ${w.endDate || ''}): ${w.description || ''}`).join('. ')}` : '',
        cv.certificates?.length ? `Chứng chỉ: ${cv.certificates.map((c: any) => c.name).join(', ')}` : '',
        cv.activities?.length ? `Hoạt động: ${cv.activities.map((a: any) => `${a.organizationName} - ${a.position}`).join(', ')}` : '',
        cv.awards?.length ? `Giải thưởng: ${cv.awards.map((a: any) => a.name).join(', ')}` : '',
      ];
      const parsedText = parsedTextParts.filter(Boolean).join('\n');

      const skillsArr = (cv.skills || []).map((s: any) => s.name).filter(Boolean);
      const educationArr = (cv.education || []).map((e: any) => `${e.schoolName || ''} - ${e.major || ''}`).filter((s: string) => s.trim() !== '-');
      const experienceArr = (cv.workExperience || []).map((w: any) => `${w.companyName || ''} - ${w.position || ''}: ${w.description || ''}`).filter(Boolean);
      const certificatesArr = (cv.certificates || []).map((c: any) => c.name).filter(Boolean);

      // Check if a UserCV already exists for this online CV (re-export case)
      const existingUserCV = await this.userCVsService.findByOnlineCvId(id, user);

      if (existingUserCV) {
        // Update existing UserCV with new PDF URL and parsed data
        await this.userCVsService.update(
          existingUserCV._id.toString(),
          {
            url: uploadResult.url,
            title: `${cv.fullName} - ${cv.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}`,
            parsedText,
            skills: skillsArr,
            education: educationArr,
            experience: experienceArr,
            certificates: certificatesArr,
          },
          user,
        );
      } else {
        // Create a new user CV entry with reference to online CV
        await this.userCVsService.create(
          {
            url: uploadResult.url,
            title: `${cv.fullName} - ${cv.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}`,
            onlineCvId: id,
            parsedText,
            skills: skillsArr,
            education: educationArr,
            experience: experienceArr,
            certificates: certificatesArr,
          },
          user,
        );
      }

      return {
        _id: cv._id,
        pdfUrl: uploadResult.url,
        message: 'Xuất PDF thành công và đã lưu vào danh sách CV',
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new BadRequestException('Không thể tạo PDF: ' + error.message);
    }
  }

  // Get preview HTML (for client-side preview)
  async getPreviewHTML(id: string, user: IUser) {
    const cv = await this.findOne(id, user);
    
    const html = cv.templateType === 'template1'
      ? this.generateTemplate1HTML(cv)
      : this.generateTemplate2HTML(cv);

    return { html };
  }
}
