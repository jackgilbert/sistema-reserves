import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  // Maximum file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  
  // Allowed image types
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  @Post('image')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only images are allowed.'), false);
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Return the file URL (adjust based on your setup)
    const fileUrl = `/uploads/images/${file.filename}`;

    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('offering-image')
  @ApiOperation({ summary: 'Upload an image for an offering' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/offerings',
        filename: (req, file, cb) => {
          const uniqueName = `offering-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed'), false);
        }
      },
    }),
  )
  async uploadOfferingImage(
    @UploadedFile() file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileUrl = `/uploads/offerings/${file.filename}`;

    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
