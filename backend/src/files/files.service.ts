import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

@Injectable()
export class FilesService {
  uploadFile(file: Express.Multer.File): Promise<{ url: String }> {
    return new Promise<{ url: String }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image', // force image type for proper preview
          folder: 'user-cvs',      // organize uploads in a folder
        },
        async (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url || result.url,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
