import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const diseaseCatalogSchema = new Schema(
  {
    _id:         { type: String, default: () => randomUUID() },
    name:        { type: String, required: true, unique: true },
    icdCode:     { type: String, default: '' },
    category:    { type: String, default: 'Other' },
    description: { type: String, default: '' },
    createdBy:   { type: String },
    createdAt:   { type: String },
    updatedBy:   { type: String, default: null },
    updatedAt:   { type: String, default: null },
  },
  { versionKey: false }
);

export default model('DiseaseCatalog', diseaseCatalogSchema);
