import { randomUUID as uuidv4 } from 'crypto';
import db from '../db/db.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

const addActivity = ({ icon, color, text, detail, performedBy = 'system' }) => {
  db.activityLog.unshift({ id: uuidv4(), icon, color, text, detail, performedBy, timestamp: new Date().toISOString() });
  if (db.activityLog.length > 100) db.activityLog.length = 100;
};

export const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let result = [...db.diseaseRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (status) {
      result = result.filter(r => r.status === status);
    }

    return success(res, result, 'Disease requests retrieved successfully');
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

    const newRequest = {
      id:                   uuidv4(),
      requestedDiseaseName: requestedDiseaseName.trim(),
      requestedByDoctor:    req.user.username,
      doctorName:           doctorName?.trim() || req.user.username,
      diagnosisId:          diagnosisId || null,
      status:               'pending',
      adminResponse:        '',
      createdAt:            new Date().toISOString(),
      updatedAt:            null,
    };

    db.diseaseRequests.push(newRequest);

    addActivity({
      icon:        'fa-circle-question',
      color:       '#F6C343',
      text:        `Disease request: "${newRequest.requestedDiseaseName}"`,
      detail:      `Requested by ${newRequest.requestedByDoctor} · awaiting admin approval`,
      performedBy: req.user.username,
    });

    return success(res, newRequest, 'Disease request submitted successfully. Waiting for admin approval.', 201);
  } catch (err) {
    return error(res, 'Failed to submit disease request.', 500);
  }
};

export const approveRequest = async (req, res) => {
  try {
    const idx = db.diseaseRequests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return error(res, 'Disease request not found.', 404);

    const request = db.diseaseRequests[idx];
    if (request.status !== 'pending') {
      return error(res, 'This request has already been processed.', 400);
    }

    const { adminResponse, addToCatalog, icdCode, category, description } = req.body;

    const resolvedIcdCode  = icdCode?.trim()  || request.suggestedIcdCode  || '';
    const resolvedCategory = category?.trim() || request.suggestedCategory || 'Other';

    db.diseaseRequests[idx] = {
      ...request,
      status:        'approved',
      adminResponse: (adminResponse || '').trim(),
      approvedBy:    req.user.username,
      updatedAt:     new Date().toISOString(),
    };

    if (request.diagnosisId) {
      const diagIdx = db.diseases.findIndex(d => d.id === request.diagnosisId);
      if (diagIdx !== -1) {
        db.diseases[diagIdx].diseaseRequestPending = false;
        db.diseases[diagIdx].diseaseRequestStatus  = 'approved';
      }
    }

    if (addToCatalog !== false) {
      const normalizedName = request.requestedDiseaseName.toLowerCase();
      const alreadyInCatalog = db.diseasesCatalog.some(d => d.name.toLowerCase() === normalizedName);

      if (!alreadyInCatalog) {
        db.diseasesCatalog.push({
          id:          uuidv4(),
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

    addActivity({
      icon:        'fa-circle-check',
      color:       '#00C875',
      text:        `Disease request approved: "${request.requestedDiseaseName}"`,
      detail:      `Requested by ${request.requestedByDoctor}`,
      performedBy: req.user.username,
    });

    return success(res, db.diseaseRequests[idx], 'Disease request approved successfully');
  } catch (err) {
    return error(res, 'Failed to approve disease request.', 500);
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const idx = db.diseaseRequests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return error(res, 'Disease request not found.', 404);

    const request = db.diseaseRequests[idx];
    if (request.status !== 'pending') {
      return error(res, 'This request has already been processed.', 400);
    }

    const { adminResponse } = req.body;

    db.diseaseRequests[idx] = {
      ...request,
      status:        'rejected',
      adminResponse: (adminResponse || '').trim(),
      rejectedBy:    req.user.username,
      updatedAt:     new Date().toISOString(),
    };

    if (request.diagnosisId) {
      const diagIdx = db.diseases.findIndex(d => d.id === request.diagnosisId);
      if (diagIdx !== -1) {
        db.diseases[diagIdx].diseaseRequestPending = false;
        db.diseases[diagIdx].diseaseRequestStatus  = 'rejected';
      }
    }

    addActivity({
      icon:        'fa-circle-xmark',
      color:       '#E63757',
      text:        `Disease request rejected: "${request.requestedDiseaseName}"`,
      detail:      `Requested by ${request.requestedByDoctor}`,
      performedBy: req.user.username,
    });

    return success(res, db.diseaseRequests[idx], 'Disease request rejected');
  } catch (err) {
    return error(res, 'Failed to reject disease request.', 500);
  }
};
