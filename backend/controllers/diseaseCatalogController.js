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

export const getDiseaseList = async (req, res) => {
  try {
    const { search, category } = req.query;
    let result = [...db.diseasesCatalog];

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.icdCode || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      );
    }

    if (category) {
      result = result.filter(d => d.category === category);
    }

    return success(res, result, 'Disease catalog retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve disease catalog.', 500);
  }
};

export const getDiseaseFromCatalog = async (req, res) => {
  try {
    const disease = db.diseasesCatalog.find(d => d.id === req.params.id);
    if (!disease) return error(res, 'Disease not found in catalog.', 404);

    return success(res, disease, 'Disease retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve disease.', 500);
  }
};

export const addDiseaseToCatalog = async (req, res) => {
  try {
    const { name, icdCode, category, description } = req.body;

    if (!name?.trim()) {
      return error(res, 'Disease name is required.', 400);
    }

    const normalizedName = name.trim().toLowerCase();
    const nameExists = db.diseasesCatalog.some(d => d.name.toLowerCase() === normalizedName);
    if (nameExists) {
      return error(res, `A disease named "${name.trim()}" already exists in the catalog.`, 400);
    }

    const newDisease = {
      id:          uuidv4(),
      name:        name.trim(),
      icdCode:     (icdCode || '').trim(),
      category:    (category || 'Other').trim(),
      description: (description || '').trim(),
      createdBy:   req.user.username,
      createdAt:   new Date().toISOString(),
      updatedBy:   null,
      updatedAt:   null,
    };

    db.diseasesCatalog.push(newDisease);

    addActivity({
      icon:        'fa-virus',
      color:       '#6741d9',
      text:        `Disease "${newDisease.name}" added to catalog`,
      detail:      `ICD: ${newDisease.icdCode || '—'} · ${newDisease.category}`,
      performedBy: req.user.username,
    });

    return success(res, newDisease, 'Disease added to catalog successfully', 201);
  } catch (err) {
    return error(res, 'Failed to add disease to catalog.', 500);
  }
};

export const updateDiseaseInCatalog = async (req, res) => {
  try {
    const idx = db.diseasesCatalog.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Disease not found in catalog.', 404);

    const { name, icdCode, category, description } = req.body;
    const existing = db.diseasesCatalog[idx];

    if (name?.trim() && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = db.diseasesCatalog.some(
        d => d.name.toLowerCase() === name.trim().toLowerCase() && d.id !== existing.id
      );
      if (nameExists) {
        return error(res, `A disease named "${name.trim()}" already exists in the catalog.`, 400);
      }
    }

    db.diseasesCatalog[idx] = {
      ...existing,
      name:        name?.trim()        || existing.name,
      icdCode:     icdCode?.trim()     ?? existing.icdCode,
      category:    category?.trim()    || existing.category,
      description: description?.trim() ?? existing.description,
      updatedBy:   req.user.username,
      updatedAt:   new Date().toISOString(),
    };

    addActivity({
      icon:        'fa-virus-slash',
      color:       '#F6C343',
      text:        `Disease "${db.diseasesCatalog[idx].name}" updated in catalog`,
      detail:      `ICD: ${db.diseasesCatalog[idx].icdCode || '—'}`,
      performedBy: req.user.username,
    });

    return success(res, db.diseasesCatalog[idx], 'Disease updated successfully');
  } catch (err) {
    return error(res, 'Failed to update disease.', 500);
  }
};

export const deleteDiseaseFromCatalog = async (req, res) => {
  try {
    const idx = db.diseasesCatalog.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Disease not found in catalog.', 404);

    const [removed] = db.diseasesCatalog.splice(idx, 1);

    addActivity({
      icon:        'fa-circle-minus',
      color:       '#E63757',
      text:        `Disease "${removed.name}" removed from catalog`,
      detail:      `ICD: ${removed.icdCode || '—'} · ${removed.category}`,
      performedBy: req.user.username,
    });

    return success(res, null, 'Disease removed from catalog successfully');
  } catch (err) {
    return error(res, 'Failed to delete disease.', 500);
  }
};
