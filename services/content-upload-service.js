const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const databaseManager = require('../database/config');

class ContentUploadService {
    constructor() {
        this.uploadDir = 'uploads/ivr-content';
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
        this.allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi'];
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        this.initializeUploadDirectory();
    }

    async initializeUploadDirectory() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('✅ IVR content upload directory initialized');
        } catch (error) {
            console.error('❌ Failed to create upload directory:', error);
        }
    }

    getStorageConfig() {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });
    }

    getFileFilter() {
        return (req, file, cb) => {
            const contentType = file.mimetype;
            const fileSize = parseInt(req.headers['content-length']);

            // Check file size
            if (fileSize > this.maxFileSize) {
                return cb(new Error(`File size too large. Maximum allowed: ${this.maxFileSize / (1024 * 1024)}MB`), false);
            }

            // Check file type
            if (this.allowedAudioTypes.includes(contentType) ||
                this.allowedVideoTypes.includes(contentType) ||
                this.allowedImageTypes.includes(contentType)) {
                return cb(null, true);
            }

            cb(new Error(`Invalid file type. Allowed types: ${[...this.allowedAudioTypes, ...this.allowedVideoTypes, ...this.allowedImageTypes].join(', ')}`), false);
        };
    }

    getUploadMiddleware() {
        return multer({
            storage: this.getStorageConfig(),
            fileFilter: this.getFileFilter(),
            limits: {
                fileSize: this.maxFileSize,
                files: 1
            }
        }).single('file');
    }

    async saveContentToDatabase(fileData, companyId) {
        try {
            const query = `
                INSERT INTO ivr_content (
                    id, company_id, name, type, file_path, file_size, 
                    mime_type, duration, dimensions, metadata, is_active, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const contentId = uuidv4();
            const now = new Date();
            
            const values = [
                contentId,
                companyId,
                fileData.name,
                fileData.type,
                fileData.filePath,
                fileData.fileSize,
                fileData.mimeType,
                fileData.duration || null,
                fileData.dimensions || null,
                JSON.stringify(fileData.metadata || {}),
                true,
                now,
                now
            ];

            const result = await databaseManager.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error saving content to database:', error);
            throw error;
        }
    }

    async processUploadedFile(file, companyId) {
        try {
            // Get file information
            const fileStats = await fs.stat(file.path);
            const fileSize = fileStats.size;
            
            // Determine content type
            const contentType = this.getContentType(file.mimetype);
            
            // Extract metadata
            const metadata = await this.extractMetadata(file, contentType);
            
            // Create content record
            const contentData = {
                name: file.originalname,
                type: contentType,
                filePath: file.path,
                fileSize: fileSize,
                mimeType: file.mimetype,
                duration: metadata.duration,
                dimensions: metadata.dimensions,
                metadata: metadata
            };

            // Save to database
            const savedContent = await this.saveContentToDatabase(contentData, companyId);
            
            return {
                success: true,
                data: savedContent,
                message: 'Content uploaded successfully'
            };
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            
            // Clean up uploaded file if database save fails
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                console.error('Failed to clean up uploaded file:', unlinkError);
            }
            
            throw error;
        }
    }

    getContentType(mimeType) {
        if (this.allowedAudioTypes.includes(mimeType)) return 'audio';
        if (this.allowedVideoTypes.includes(mimeType)) return 'video';
        if (this.allowedImageTypes.includes(mimeType)) return 'image';
        return 'other';
    }

    async extractMetadata(file, contentType) {
        const metadata = {};
        
        try {
            if (contentType === 'audio') {
                metadata.duration = await this.getAudioDuration(file.path);
            } else if (contentType === 'video') {
                const videoMetadata = await this.getVideoMetadata(file.path);
                metadata.duration = videoMetadata.duration;
                metadata.dimensions = videoMetadata.dimensions;
            } else if (contentType === 'image') {
                metadata.dimensions = await this.getImageDimensions(file.path);
            }
        } catch (error) {
            console.warn('Could not extract metadata for file:', file.originalname, error.message);
        }
        
        return metadata;
    }

    async getAudioDuration(filePath) {
        // This would integrate with a media processing library like ffmpeg
        // For now, return null
        return null;
    }

    async getVideoMetadata(filePath) {
        // This would integrate with a media processing library like ffmpeg
        // For now, return default values
        return {
            duration: null,
            dimensions: null
        };
    }

    async getImageDimensions(filePath) {
        // This would integrate with an image processing library like sharp
        // For now, return null
        return null;
    }

    async getContentById(contentId, companyId) {
        try {
            const query = `
                SELECT * FROM ivr_content 
                WHERE id = $1 AND company_id = $2 AND is_active = true
            `;
            
            const result = await databaseManager.query(query, [contentId, companyId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting content by ID:', error);
            throw error;
        }
    }

    async getCompanyContent(companyId, filters = {}) {
        try {
            let query = `
                SELECT * FROM ivr_content 
                WHERE company_id = $1 AND is_active = true
            `;
            
            const values = [companyId];
            let paramCount = 1;
            
            // Add type filter
            if (filters.type) {
                paramCount++;
                query += ` AND type = $${paramCount}`;
                values.push(filters.type);
            }
            
            // Add search filter
            if (filters.search) {
                paramCount++;
                query += ` AND name ILIKE $${paramCount}`;
                values.push(`%${filters.search}%`);
            }
            
            // Add sorting
            query += ` ORDER BY created_at DESC`;
            
            // Add pagination
            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                values.push(filters.limit);
            }
            
            if (filters.offset) {
                paramCount++;
                query += ` OFFSET $${paramCount}`;
                values.push(filters.offset);
            }
            
            const result = await databaseManager.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Error getting company content:', error);
            throw error;
        }
    }

    async updateContent(contentId, updates, companyId) {
        try {
            const allowedUpdates = ['name', 'is_active', 'metadata'];
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            
            // Build update query dynamically
            for (const [key, value] of Object.entries(updates)) {
                if (allowedUpdates.includes(key)) {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }
            
            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Add updated_at timestamp
            updateFields.push(`updated_at = $${paramCount}`);
            values.push(new Date());
            paramCount++;
            
            // Add WHERE clause parameters
            values.push(contentId, companyId);
            
            const query = `
                UPDATE ivr_content 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;
            
            const result = await databaseManager.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error updating content:', error);
            throw error;
        }
    }

    async deleteContent(contentId, companyId) {
        try {
            // Get content info first
            const content = await this.getContentById(contentId, companyId);
            if (!content) {
                throw new Error('Content not found');
            }
            
            // Delete file from filesystem
            try {
                await fs.unlink(content.file_path);
            } catch (unlinkError) {
                console.warn('Could not delete file from filesystem:', unlinkError.message);
            }
            
            // Mark as deleted in database (soft delete)
            const query = `
                UPDATE ivr_content 
                SET is_active = false, updated_at = $1
                WHERE id = $2 AND company_id = $3
                RETURNING *
            `;
            
            const result = await databaseManager.query(query, [new Date(), contentId, companyId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error deleting content:', error);
            throw error;
        }
    }

    async getContentStats(companyId) {
        try {
            const query = `
                SELECT 
                    type,
                    COUNT(*) as count,
                    SUM(file_size) as total_size
                FROM ivr_content 
                WHERE company_id = $1 AND is_active = true
                GROUP BY type
            `;
            
            const result = await databaseManager.query(query, [companyId]);
            
            const stats = {
                total: 0,
                total_size: 0,
                by_type: {}
            };
            
            result.rows.forEach(row => {
                stats.total += parseInt(row.count);
                stats.total_size += parseInt(row.total_size || 0);
                stats.by_type[row.type] = {
                    count: parseInt(row.count),
                    size: parseInt(row.total_size || 0)
                };
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting content stats:', error);
            throw error;
        }
    }

    async validateContentAccess(contentId, companyId) {
        try {
            const content = await this.getContentById(contentId, companyId);
            return content !== null;
        } catch (error) {
            console.error('Error validating content access:', error);
            return false;
        }
    }

    getContentUrl(filePath) {
        // Convert file path to URL
        const relativePath = filePath.replace(this.uploadDir, '');
        return `/uploads/ivr-content${relativePath}`;
    }

    async cleanupOrphanedFiles() {
        try {
            const files = await fs.readdir(this.uploadDir);
            
            for (const file of files) {
                const filePath = path.join(this.uploadDir, file);
                
                // Check if file exists in database
                const query = `
                    SELECT COUNT(*) FROM ivr_content 
                    WHERE file_path = $1 AND is_active = true
                `;
                
                const result = await databaseManager.query(query, [filePath]);
                const exists = parseInt(result.rows[0].count) > 0;
                
                if (!exists) {
                    // File is orphaned, delete it
                    try {
                        await fs.unlink(filePath);
                        console.log(`Cleaned up orphaned file: ${file}`);
                    } catch (unlinkError) {
                        console.warn(`Could not delete orphaned file: ${file}`, unlinkError.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up orphaned files:', error);
        }
    }

    /**
     * Get all content (for global admin)
     */
    async getAllContent(filters = {}) {
        try {
            let query = `
                SELECT c.*, comp.name as company_name, comp.domain as company_domain
                FROM ivr_content c
                LEFT JOIN companies comp ON c.company_id = comp.id
                WHERE c.is_active = true
            `;
            const params = [];
            let paramCount = 1;

            if (filters.type) {
                query += ` AND c.type = $${paramCount}`;
                params.push(filters.type);
                paramCount++;
            }

            if (filters.search) {
                query += ` AND (c.name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
                params.push(`%${filters.search}%`);
                paramCount++;
            }

            query += ` ORDER BY c.created_at DESC`;

            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
                paramCount++;
            }

            if (filters.offset) {
                query += ` OFFSET $${paramCount}`;
                params.push(filters.offset);
            }

            const result = await databaseManager.query(query, params);
            return result.rows.map(item => ({
                ...item,
                url: this.getContentUrl(item.file_path)
            }));
        } catch (error) {
            console.error('Error getting all content:', error);
            throw error;
        }
    }
}

module.exports = ContentUploadService;


