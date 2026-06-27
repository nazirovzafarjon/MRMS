import DiseaseCatalog from '../models/DiseaseCatalog.js';
import { addActivity } from '../utils/activity.js';
import { toApi, toApiList, escapeRegExp } from '../utils/serialize.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getDiseaseList = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};
    if (category) filter.category = category;

    let result = await DiseaseCatalog.find(filter).lean();

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.icdCode || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      );
    }

    return success(res, toApiList(result), 'Disease catalog retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve disease catalog.', 500);
  }
};

export const getDiseaseFromCatalog = async (req, res) => {
  try {
    const disease = await DiseaseCatalog.findById(req.params.id).lean();
    if (!disease) return error(res, 'Disease not found in catalog.', 404);

    return success(res, toApi(disease), 'Disease retrieved successfully');
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

    const nameExists = await DiseaseCatalog.exists({
      name: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
    });
    if (nameExists) {
      return error(res, `A disease named "${name.trim()}" already exists in the catalog.`, 400);
    }

    const newDisease = await DiseaseCatalog.create({
      name:        name.trim(),
      icdCode:     (icdCode || '').trim(),
      category:    (category || 'Other').trim(),
      description: (description || '').trim(),
      createdBy:   req.user.username,
      createdAt:   new Date().toISOString(),
      updatedBy:   null,
      updatedAt:   null,
    });

    await addActivity({
      icon:        'fa-virus',
      color:       '#6741d9',
      text:        `Disease "${newDisease.name}" added to catalog`,
      detail:      `ICD: ${newDisease.icdCode || '—'} · ${newDisease.category}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(newDisease.toObject()), 'Disease added to catalog successfully', 201);
  } catch (err) {
    return error(res, 'Failed to add disease to catalog.', 500);
  }
};

export const updateDiseaseInCatalog = async (req, res) => {
  try {
    const existing = await DiseaseCatalog.findById(req.params.id).lean();
    if (!existing) return error(res, 'Disease not found in catalog.', 404);

    const { name, icdCode, category, description } = req.body;

    if (name?.trim() && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await DiseaseCatalog.exists({
        _id:  { $ne: existing._id },
        name: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
      });
      if (nameExists) {
        return error(res, `A disease named "${name.trim()}" already exists in the catalog.`, 400);
      }
    }

    const updated = await DiseaseCatalog.findByIdAndUpdate(
      req.params.id,
      {
        name:        name?.trim()        || existing.name,
        icdCode:     icdCode?.trim()     ?? existing.icdCode,
        category:    category?.trim()    || existing.category,
        description: description?.trim() ?? existing.description,
        updatedBy:   req.user.username,
        updatedAt:   new Date().toISOString(),
      },
      { returnDocument: 'after' }
    ).lean();

    await addActivity({
      icon:        'fa-virus-slash',
      color:       '#F6C343',
      text:        `Disease "${updated.name}" updated in catalog`,
      detail:      `ICD: ${updated.icdCode || '—'}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updated), 'Disease updated successfully');
  } catch (err) {
    return error(res, 'Failed to update disease.', 500);
  }
};

export const deleteDiseaseFromCatalog = async (req, res) => {
  try {
    const removed = await DiseaseCatalog.findByIdAndDelete(req.params.id).lean();
    if (!removed) return error(res, 'Disease not found in catalog.', 404);

    await addActivity({
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
