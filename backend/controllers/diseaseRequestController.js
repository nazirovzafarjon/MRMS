import DiseaseRequest from '../models/DiseaseRequest.js';
import DiseaseCatalog from '../models/DiseaseCatalog.js';
import Disease         from '../models/Disease.js';
import { addActivity } from '../utils/activity.js';
import { toApi, toApiList, escapeRegExp } from '../utils/serialize.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const result = await DiseaseRequest.find(filter).sort({ createdAt: -1 }).lean();

    return success(res, toApiList(result), 'Disease requests retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve disease requests.', 500);
  }
};

export const submitDiseaseRequest = async (req, res) => {
  try {
    const { requestedDiseaseName, diagnosisId, doctorName } = req.body;

    if (!requestedDiseaseName?.trim()) {
      return error(res, 'Requested disease name is required.', 400);
    }

    const newRequest = await DiseaseRequest.create({
      requestedDiseaseName: requestedDiseaseName.trim(),
      requestedByDoctor:    req.user.username,
      doctorName:           doctorName?.trim() || req.user.username,
      diagnosisId:          diagnosisId || null,
      status:               'pending',
      adminResponse:        '',
      createdAt:            new Date().toISOString(),
      updatedAt:            null,
    });

    await addActivity({
      icon:        'fa-circle-question',
      color:       '#F6C343',
      text:        `Disease request: "${newRequest.requestedDiseaseName}"`,
      detail:      `Requested by ${newRequest.requestedByDoctor} · awaiting admin approval`,
      performedBy: req.user.username,
    });

    return success(res, toApi(newRequest.toObject()), 'Disease request submitted successfully. Waiting for admin approval.', 201);
  } catch (err) {
    return error(res, 'Failed to submit disease request.', 500);
  }
};

export const approveRequest = async (req, res) => {
  try {
    const request = await DiseaseRequest.findById(req.params.id).lean();
    if (!request) return error(res, 'Disease request not found.', 404);

    if (request.status !== 'pending') {
      return error(res, 'This request has already been processed.', 400);
    }

    const { adminResponse, addToCatalog, icdCode, category, description } = req.body;

    const resolvedIcdCode  = icdCode?.trim()  || request.suggestedIcdCode  || '';
    const resolvedCategory = category?.trim() || request.suggestedCategory || 'Other';

    const updatedRequest = await DiseaseRequest.findByIdAndUpdate(
      req.params.id,
      {
        status:        'approved',
        adminResponse: (adminResponse || '').trim(),
        approvedBy:    req.user.username,
        updatedAt:     new Date().toISOString(),
      },
      { returnDocument: 'after' }
    ).lean();

    if (request.diagnosisId) {
      await Disease.findByIdAndUpdate(request.diagnosisId, {
        diseaseRequestPending: false,
        diseaseRequestStatus:  'approved',
      });
    }

    if (addToCatalog !== false) {
      const normalizedName = request.requestedDiseaseName.toLowerCase();
      const alreadyInCatalog = await DiseaseCatalog.exists({
        name: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i'),
      });

      if (!alreadyInCatalog) {
        await DiseaseCatalog.create({
          name:        request.requestedDiseaseName,
          icdCode:     resolvedIcdCode,
          category:    resolvedCategory,
          description: (description || '').trim(),
          createdBy:   req.user.username,
          createdAt:   new Date().toISOString(),
          updatedBy:   null,
          updatedAt:   null,
        });
      }
    }

    await addActivity({
      icon:        'fa-circle-check',
      color:       '#00C875',
      text:        `Disease request approved: "${request.requestedDiseaseName}"`,
      detail:      `Requested by ${request.requestedByDoctor}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updatedRequest), 'Disease request approved successfully');
  } catch (err) {
    return error(res, 'Failed to approve disease request.', 500);
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const request = await DiseaseRequest.findById(req.params.id).lean();
    if (!request) return error(res, 'Disease request not found.', 404);

    if (request.status !== 'pending') {
      return error(res, 'This request has already been processed.', 400);
    }

    const { adminResponse } = req.body;

    const updatedRequest = await DiseaseRequest.findByIdAndUpdate(
      req.params.id,
      {
        status:        'rejected',
        adminResponse: (adminResponse || '').trim(),
        rejectedBy:    req.user.username,
        updatedAt:     new Date().toISOString(),
      },
      { returnDocument: 'after' }
    ).lean();

    if (request.diagnosisId) {
      await Disease.findByIdAndUpdate(request.diagnosisId, {
        diseaseRequestPending: false,
        diseaseRequestStatus:  'rejected',
      });
    }

    await addActivity({
      icon:        'fa-circle-xmark',
      color:       '#E63757',
      text:        `Disease request rejected: "${request.requestedDiseaseName}"`,
      detail:      `Requested by ${request.requestedByDoctor}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updatedRequest), 'Disease request rejected');
  } catch (err) {
    return error(res, 'Failed to reject disease request.', 500);
  }
};
