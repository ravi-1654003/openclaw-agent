export const toVectorParam = (embedding) => {
  if (!embedding || !Array.isArray(embedding)) return null;
  return JSON.stringify(embedding);
};

export const toJsonbParam = (value) => JSON.stringify(value ?? {});
