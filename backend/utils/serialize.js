// Converts a Mongoose lean document (or plain object with _id) into the same
// shape the API returned when records were plain objects with a string `id`.
export const toApi = (doc) => {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return { id: _id, ...rest };
};

export const toApiList = (docs = []) => docs.map(toApi);

// Escapes user input for safe use inside a RegExp, preserving the original
// substring/case-insensitive matching semantics of Array.prototype.filter.
export const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
