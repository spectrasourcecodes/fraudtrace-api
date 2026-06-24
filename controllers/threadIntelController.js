const ThreatIntelligence = require('../models/ThreatIntelligence');
const Case = require('../models/Case');

// @desc    Get all threats
// @route   GET /api/threat-intel
exports.getThreats = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      minRisk, 
      maxRisk,
      search 
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (minRisk) query.riskScore = { $gte: parseInt(minRisk) };
    if (maxRisk) query.riskScore = { ...query.riskScore, $lte: parseInt(maxRisk) };
    if (search) {
      query.$or = [
        { value: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const threats = await ThreatIntelligence.find(query)
      .sort('-riskScore')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('relatedCases', 'caseId title status');

    const total = await ThreatIntelligence.countDocuments(query);

    res.status(200).json({
      success: true,
      data: threats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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

// @desc    Get single threat
// @route   GET /api/threat-intel/:id
exports.getThreat = async (req, res) => {
  try {
    const threat = await ThreatIntelligence.findById(req.params.id)
      .populate('relatedCases', 'caseId title status amountLost');

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat not found'
      });
    }

    res.status(200).json({
      success: true,
      data: threat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create threat
// @route   POST /api/threat-intel
exports.createThreat = async (req, res) => {
  try {
    const { type, value, riskScore, tags, notes, connections } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type and value'
      });
    }

    // Check if threat already exists
    const existingThreat = await ThreatIntelligence.findOne({ type, value });
    if (existingThreat) {
      // Update occurrences and risk score
      existingThreat.occurrences += 1;
      existingThreat.lastSeen = Date.now();
      if (riskScore && riskScore > existingThreat.riskScore) {
        existingThreat.riskScore = riskScore;
      }
      await existingThreat.save();

      return res.status(200).json({
        success: true,
        data: existingThreat,
        message: 'Existing threat updated'
      });
    }

    const threat = await ThreatIntelligence.create({
      type,
      value,
      riskScore: riskScore || 50,
      tags: tags || [],
      notes,
      connections: connections || []
    });

    res.status(201).json({
      success: true,
      data: threat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update threat
// @route   PUT /api/threat-intel/:id
exports.updateThreat = async (req, res) => {
  try {
    const threat = await ThreatIntelligence.findById(req.params.id);

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat not found'
      });
    }

    const allowedFields = ['riskScore', 'tags', 'notes', 'status', 'connections'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        threat[field] = req.body[field];
      }
    });

    threat.lastSeen = Date.now();
    await threat.save();

    res.status(200).json({
      success: true,
      data: threat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete threat
// @route   DELETE /api/threat-intel/:id
exports.deleteThreat = async (req, res) => {
  try {
    const threat = await ThreatIntelligence.findByIdAndDelete(req.params.id);

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Threat deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search threats
// @route   GET /api/threat-intel/search
exports.searchThreats = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    const threats = await ThreatIntelligence.find({
      $or: [
        { value: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { type: { $regex: q, $options: 'i' } }
      ]
    })
    .sort('-riskScore')
    .limit(20)
    .populate('relatedCases', 'caseId title');

    res.status(200).json({
      success: true,
      count: threats.length,
      data: threats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get threat statistics
// @route   GET /api/threat-intel/stats
exports.getThreatStats = async (req, res) => {
  try {
    const totalThreats = await ThreatIntelligence.countDocuments();
    
    const byType = await ThreatIntelligence.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, avgRisk: { $avg: '$riskScore' } } }
    ]);

    const byStatus = await ThreatIntelligence.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const highRiskThreats = await ThreatIntelligence.countDocuments({ riskScore: { $gte: 70 } });
    const criticalThreats = await ThreatIntelligence.countDocuments({ riskScore: { $gte: 90 } });

    const recentThreats = await ThreatIntelligence.find()
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        total: totalThreats,
        highRisk: highRiskThreats,
        critical: criticalThreats,
        byType,
        byStatus,
        recentThreats
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

// @desc    Link threat to a case
// @route   POST /api/threat-intel/:id/link-case
exports.linkThreatToCase = async (req, res) => {
  try {
    const { caseId } = req.body;
    const threat = await ThreatIntelligence.findById(req.params.id);

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat not found'
      });
    }

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Add case to threat's related cases
    if (!threat.relatedCases.includes(caseId)) {
      threat.relatedCases.push(caseId);
      threat.occurrences += 1;
      await threat.save();
    }

    res.status(200).json({
      success: true,
      data: threat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get related threats
// @route   GET /api/threat-intel/:id/related
exports.getRelatedThreats = async (req, res) => {
  try {
    const threat = await ThreatIntelligence.findById(req.params.id);

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat not found'
      });
    }

    // Find threats with similar tags or connections
    const relatedThreats = await ThreatIntelligence.find({
      _id: { $ne: threat._id },
      $or: [
        { tags: { $in: threat.tags } },
        { type: threat.type },
        { 'connections.value': { $in: threat.connections.map(c => c.value) } }
      ]
    })
    .limit(10)
    .sort('-riskScore');

    res.status(200).json({
      success: true,
      count: relatedThreats.length,
      data: relatedThreats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};