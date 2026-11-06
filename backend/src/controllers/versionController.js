const mongoose = require('mongoose');
const DesignVersion = require('../models/DesignVersion');
const Template = require('../models/Template');

function computeStats(docData) {
  let frameCount = 0;
  let nodeCount = 0;
  let wireCount = 0;

  if (docData && typeof docData === 'object') {
    if (Array.isArray(docData.frames)) {
      frameCount = docData.frames.length;
      docData.frames.forEach(f => {
        if (f.action && f.action.to) wireCount++;
        if (f.swipes) {
          Object.values(f.swipes).forEach(s => {
            if (s && s.to) wireCount++;
          });
        }
      });
    }
    if (Array.isArray(docData.groups)) {
      docData.groups.forEach(g => {
        if (Array.isArray(g.items)) {
          nodeCount += g.items.length;
          g.items.forEach(it => {
            if (it.action && it.action.to) wireCount++;
          });
        }
      });
    }
  }

  return { frameCount, nodeCount, wireCount };
}

/**
 * @desc    Get all design versions for a template
 * @route   GET /api/templates/:templateId/versions
 * @access  Public / Authenticated
 */
exports.getVersions = async (req, res, next) => {
  try {
    const { templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID format' });
    }

    const template = await Template.findById(templateId).select('_id title author');
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const versions = await DesignVersion.find({ templateId })
      .sort({ versionNumber: -1 })
      .select('-docData') // Omit full heavy docData in list view
      .lean();

    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single version detail with full docData
 * @route   GET /api/templates/:templateId/versions/:versionId
 * @access  Public / Authenticated
 */
exports.getVersionById = async (req, res, next) => {
  try {
    const { templateId, versionId } = req.params;

    const version = await DesignVersion.findOne({ _id: versionId, templateId });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version snapshot not found' });
    }

    res.status(200).json({
      success: true,
      data: version,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new design version snapshot
 * @route   POST /api/templates/:templateId/versions
 * @access  Authenticated (or creator)
 */
exports.createVersion = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { versionName, description, docData, thumbnailUrl, isSnapshot } = req.body;

    if (!docData) {
      return res.status(400).json({ success: false, message: 'docData is required to create a version snapshot' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Determine next version number
    const lastVersion = await DesignVersion.findOne({ templateId })
      .sort({ versionNumber: -1 })
      .select('versionNumber');
    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const stats = computeStats(docData);
    const finalName = versionName && versionName.trim()
      ? versionName.trim()
      : isSnapshot
        ? `Snapshot V${versionNumber}`
        : `Auto-save #${versionNumber}`;

    const newVersion = await DesignVersion.create({
      templateId,
      userId: req.user ? req.user._id : template.author,
      authorName: req.user ? req.user.name : template.authorName || 'PickMe3D Designer',
      versionName: finalName,
      versionNumber,
      description: description || '',
      docData,
      thumbnailUrl: thumbnailUrl || template.thumbnailUrl || '',
      stats,
      isSnapshot: Boolean(isSnapshot),
    });

    res.status(201).json({
      success: true,
      message: 'Design version snapshot created successfully',
      data: newVersion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rollback template to a specific design version
 * @route   POST /api/templates/:templateId/versions/:versionId/rollback
 * @access  Authenticated (author / admin)
 */
exports.rollbackVersion = async (req, res, next) => {
  try {
    const { templateId, versionId } = req.params;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const targetVersion = await DesignVersion.findOne({ _id: versionId, templateId });
    if (!targetVersion) {
      return res.status(404).json({ success: false, message: 'Target version not found' });
    }

    // 1. Safety Backup: Create a snapshot of current template state before rolling back!
    const lastVersion = await DesignVersion.findOne({ templateId })
      .sort({ versionNumber: -1 })
      .select('versionNumber');
    const backupVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const currentStats = computeStats(template.docData);
    const backupSnapshot = await DesignVersion.create({
      templateId,
      userId: req.user ? req.user._id : template.author,
      authorName: req.user ? req.user.name : template.authorName,
      versionName: `Pre-Rollback Backup (before V${targetVersion.versionNumber})`,
      versionNumber: backupVersionNumber,
      description: `Automatic recovery point created prior to restoring V${targetVersion.versionNumber} ("${targetVersion.versionName}")`,
      docData: template.docData,
      thumbnailUrl: template.thumbnailUrl,
      stats: currentStats,
      isSnapshot: true,
      isRollback: true,
      rollbackFromVersion: targetVersion._id,
    });

    // 2. Perform the Rollback on Template
    template.docData = targetVersion.docData;
    if (targetVersion.thumbnailUrl) {
      template.thumbnailUrl = targetVersion.thumbnailUrl;
    }
    await template.save();

    // 3. Record the Rollback Event as a new active version
    const rollbackRecord = await DesignVersion.create({
      templateId,
      userId: req.user ? req.user._id : template.author,
      authorName: req.user ? req.user.name : template.authorName,
      versionName: `Restored V${targetVersion.versionNumber} ("${targetVersion.versionName}")`,
      versionNumber: backupVersionNumber + 1,
      description: `Rolled back to version V${targetVersion.versionNumber}.`,
      docData: targetVersion.docData,
      thumbnailUrl: targetVersion.thumbnailUrl,
      stats: targetVersion.stats,
      isSnapshot: true,
      isRollback: true,
      rollbackFromVersion: targetVersion._id,
    });

    res.status(200).json({
      success: true,
      message: `Successfully rolled back to version ${targetVersion.versionNumber}`,
      data: {
        currentDocData: template.docData,
        restoredVersion: targetVersion,
        safetyBackup: backupSnapshot,
        rollbackRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a specific design version
 * @route   DELETE /api/templates/:templateId/versions/:versionId
 * @access  Authenticated (author / admin)
 */
exports.deleteVersion = async (req, res, next) => {
  try {
    const { templateId, versionId } = req.params;

    const version = await DesignVersion.findOneAndDelete({ _id: versionId, templateId });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Version snapshot deleted successfully',
      deletedId: versionId,
    });
  } catch (error) {
    next(error);
  }
};

