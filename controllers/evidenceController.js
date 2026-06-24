const Evidence = require('../models/Evidence');
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const path = require('path');
const { isCloudinaryAvailable, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

// @desc    Upload evidence files
// @route   POST /api/evidence/:caseId
exports.uploadEvidence = async (req, res) => {
  try {
    console.log('=== Evidence Upload Request ===');
    console.log('Case ID:', req.params.caseId);
    console.log('Files received:', req.files?.length || 0);
    console.log('Cloudinary available:', isCloudinaryAvailable());

    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && caseData.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload evidence to this case'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one file'
      });
    }

    const { description, category, tags } = req.body;

    // Check existing evidence count
    const existingCount = await Evidence.countDocuments({ 
      caseId: caseData._id, 
      isActive: true 
    });

    if (existingCount + req.files.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 evidence files per case. Please remove some files first.'
      });
    }

    // Create evidence records in database
    const evidenceFiles = [];
    
    for (const file of req.files) {
      let fileUrl = '';
      let publicId = '';
      let metadata = {};

      // Try Cloudinary upload if available
      if (isCloudinaryAvailable() && file.buffer) {
        try {
          console.log('Uploading to Cloudinary:', file.originalname);
          const result = await uploadToCloudinary(file.buffer, {
            folder: `fraud-trace-recovery/cases/${caseData.caseId}`,
          });
          fileUrl = result.secure_url;
          publicId = result.public_id;
          metadata = {
            width: result.width?.toString() || '',
            height: result.height?.toString() || '',
            format: result.format || '',
            bytes: String(result.bytes || file.size),
            resourceType: result.resource_type || '',
            storage: 'cloudinary',
          };
          console.log('Cloudinary upload success:', publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed, using local storage:', cloudinaryError.message);
          // Fall through to local storage
        }
      }

      // If Cloudinary not available or failed, use local storage
      if (!fileUrl) {
        console.log('Using local storage for:', file.originalname);
        fileUrl = `/uploads/evidence/${file.filename}`;
        publicId = file.filename;
        metadata = {
          originalname: file.originalname,
          encoding: file.encoding || '',
          size: String(file.size),
          storage: 'local',
        };
      }

      const evidence = await Evidence.create({
        caseId: caseData._id,
        fileName: file.originalname,
        fileUrl: fileUrl,
        publicId: publicId,
        fileType: getFileType(file.mimetype, file.originalname),
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user.id,
        description: description || '',
        category: category || 'other',
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        metadata: metadata,
      });

      evidenceFiles.push(evidence);
    }

    // Notify assigned investigator
    if (caseData.assignedInvestigator) {
      await Notification.create({
        user: caseData.assignedInvestigator,
        title: 'New Evidence Uploaded',
        message: `${evidenceFiles.length} new file(s) uploaded to case ${caseData.caseId}`,
        type: 'evidence_status',
        relatedCase: caseData._id,
        priority: 'high'
      });
    }

    // Update case status if needed
    if (caseData.status === 'submitted') {
      caseData.status = 'evidence_verification';
      caseData.statusHistory.push({
        status: 'evidence_verification',
        changedBy: req.user.id,
        timestamp: Date.now(),
        notes: 'Evidence files uploaded'
      });
      await caseData.save();
    }

    console.log(`Successfully uploaded ${evidenceFiles.length} evidence files`);

    res.status(201).json({
      success: true,
      count: evidenceFiles.length,
      data: evidenceFiles,
      message: `${evidenceFiles.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Evidence upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload evidence',
      error: error.message
    });
  }
};

// @desc    Delete evidence
// @route   DELETE /api/evidence/:id
exports.deleteEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check authorization
    if (evidence.uploadedBy.toString() !== req.user.id && req.user.role === 'user') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this evidence'
      });
    }

    // Delete from Cloudinary if stored there
    if (evidence.publicId && evidence.metadata?.storage === 'cloudinary' && isCloudinaryAvailable()) {
      try {
        await deleteFromCloudinary(evidence.publicId);
        console.log('Deleted from Cloudinary:', evidence.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
        // Continue with soft delete even if Cloudinary delete fails
      }
    }

    // Soft delete from database
    evidence.isActive = false;
    evidence.deletedAt = Date.now();
    evidence.deletedBy = req.user.id;
    await evidence.save();

    res.status(200).json({
      success: true,
      message: 'Evidence deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get evidence by case
// @route   GET /api/evidence/case/:caseId
exports.getEvidenceByCase = async (req, res) => {
  try {
    const evidence = await Evidence.find({ 
      caseId: req.params.caseId,
      isActive: true 
    }).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: evidence.length,
      data: evidence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single evidence
// @route   GET /api/evidence/:id
exports.getEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('caseId', 'caseId title');

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update evidence metadata
// @route   PUT /api/evidence/:id
exports.updateEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    const { description, category } = req.body;
    if (description !== undefined) evidence.description = description;
    if (category) evidence.category = category;

    await evidence.save();

    res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Download evidence
// @route   GET /api/evidence/:id/download
exports.downloadEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // For Cloudinary URLs, redirect
    if (evidence.fileUrl?.startsWith('http')) {
      return res.redirect(evidence.fileUrl);
    }

    // For local files, send the file
    const filePath = path.join(__dirname, '..', evidence.fileUrl);
    res.download(filePath, evidence.fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify evidence (investigator only)
// @route   PUT /api/evidence/:id/verify
exports.verifyEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id)
      .populate('caseId', 'caseId title user');

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status. Must be "verified" or "rejected"'
      });
    }

    // Store old status for notification message
    const oldStatus = evidence.verificationStatus;

    // Update evidence
    evidence.verificationStatus = status;
    evidence.verifiedBy = req.user.id;
    evidence.verifiedAt = Date.now();
    await evidence.save();

    // ============================================
    // NOTIFY THE CASE OWNER (VICTIM/USER)
    // ============================================
    const caseData = evidence.caseId;
    
    if (caseData && caseData.user) {
      const Notification = require('../models/Notification');
      const User = require('../models/User');

      // Get investigator name for the message
      const investigator = await User.findById(req.user.id);
      const investigatorName = investigator?.name || 'An investigator';

      // Create notification message based on status
      let title, message, priority;

      if (status === 'verified') {
        title = '✅ Evidence Verified';
        message = `Your evidence file "${evidence.fileName}" has been verified by ${investigatorName} for case "${caseData.title || caseData.caseId}".`;
        priority = 'normal';
      } else {
        title = '⚠️ Evidence Needs Review';
        message = `Your evidence file "${evidence.fileName}" for case "${caseData.title || caseData.caseId}" requires additional review. ${investigatorName} has marked it as rejected. Please check your case for details.`;
        priority = 'high';
      }

      // Create in-app notification for the case owner
      await Notification.create({
        user: caseData.user,
        title: title,
        message: message,
        type: 'evidence_status',
        relatedCase: caseData._id,
        priority: priority,
      });

      // ============================================
      // EMIT REAL-TIME SOCKET NOTIFICATION
      // ============================================
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${caseData.user}`).emit('notification', {
          _id: new Date().getTime().toString(),
          title: title,
          message: message,
          type: 'evidence_status',
          relatedCase: caseData._id,
          priority: priority,
          read: false,
          createdAt: new Date().toISOString(),
        });

        // Also emit to case room if investigator is watching
        io.to(`case_${caseData._id}`).emit('evidence_updated', {
          evidenceId: evidence._id,
          status: status,
          verifiedBy: req.user.id,
          verifiedAt: evidence.verifiedAt,
        });
      }

      console.log(`📢 Notification sent to user ${caseData.user} about evidence ${status}`);
    }

    // Return updated evidence
    const updatedEvidence = await Evidence.findById(evidence._id)
      .populate('verifiedBy', 'name email');

    res.status(200).json({
      success: true,
      data: updatedEvidence,
      message: `Evidence ${status} successfully`
    });
  } catch (error) {
    console.error('Verify evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add tags to evidence
// @route   PUT /api/evidence/:id/tags
exports.addTags = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id)
      .populate('caseId', 'caseId title user');

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }

    // Store old tags to know what's new
    const oldTags = [...evidence.tags];
    
    // Add new tags (remove duplicates)
    evidence.tags = [...new Set([...evidence.tags, ...tags])];
    await evidence.save();

    // Find newly added tags
    const newTags = tags.filter(tag => !oldTags.includes(tag));

    // ============================================
    // NOTIFY THE CASE OWNER (optional - for significant tag additions)
    // ============================================
    if (newTags.length > 0 && evidence.caseId?.user) {
      const Notification = require('../models/Notification');
      const User = require('../models/User');

      // Only notify if important tags are added
      const importantTags = ['verified', 'fraudulent', 'critical', 'evidence', 'approved', 'confirmed'];
      const hasImportantTag = newTags.some(tag => 
        importantTags.includes(tag.toLowerCase())
      );

      if (hasImportantTag) {
        const investigator = await User.findById(req.user.id);
        const investigatorName = investigator?.name || 'An investigator';

        await Notification.create({
          user: evidence.caseId.user,
          title: '🏷️ Evidence Tagged',
          message: `${investigatorName} added important tags (${newTags.join(', ')}) to evidence "${evidence.fileName}" in case "${evidence.caseId.title || evidence.caseId.caseId}".`,
          type: 'evidence_status',
          relatedCase: evidence.caseId._id,
          priority: 'low',
        });

        // Emit socket notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${evidence.caseId.user}`).emit('notification', {
            _id: new Date().getTime().toString(),
            title: '🏷️ Evidence Tagged',
            message: `${investigatorName} added tags to your evidence.`,
            type: 'evidence_status',
            relatedCase: evidence.caseId._id,
            priority: 'low',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }

        console.log(`📢 Tag notification sent to user ${evidence.caseId.user}`);
      }
    }

    res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    console.error('Add tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get evidence statistics
// @route   GET /api/evidence/stats
exports.getEvidenceStats = async (req, res) => {
  try {
    const totalFiles = await Evidence.countDocuments({ isActive: true });
    
    const byType = await Evidence.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$fileType', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
    ]);

    const byVerification = await Evidence.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalFiles,
        byType,
        byVerification
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to determine file type
const getFileType = (mimetype, filename) => {
  // Check by MIME type first
  if (mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype === 'application/pdf') return 'document';
    if (mimetype.startsWith('video/')) return 'video';
  }
  
  // Fallback to extension check
  const ext = path.extname(filename || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) return 'image';
  if (['.pdf', '.doc', '.docx'].includes(ext)) return 'document';
  if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) return 'video';
  
  return 'other';
};