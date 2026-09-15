const pushUnique = (bucket: string[], value: unknown) => {
  if (typeof value !== 'string') return;
  const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || bucket.includes(text)) return;
  if (text.startsWith('Request failed')) return;
  bucket.push(text);
};

const collectFromUnknown = (bucket: string[], value: unknown, depth = 0) => {
  if (value == null || depth > 3) return;
  if (typeof value === 'string') {
    pushUnique(bucket, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectFromUnknown(bucket, item, depth + 1));
    return;
  }
  if (typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  pushUnique(bucket, obj.title);
  pushUnique(bucket, obj.message);
  pushUnique(bucket, obj.description);
  pushUnique(bucket, obj.detail);
  pushUnique(bucket, obj.error);
  if (obj.errors != null) collectFromUnknown(bucket, obj.errors, depth + 1);
  if (obj.data != null && obj.data !== obj) collectFromUnknown(bucket, obj.data, depth + 1);
  Object.entries(obj).forEach(([key, nested]) => {
    if (['title', 'message', 'description', 'detail', 'error', 'errors', 'data', 'status', 'timestamp', 'path'].includes(key)) {
      return;
    }
    if (typeof nested === 'string') pushUnique(bucket, nested);
  });
};

export const collectApiErrorMessages = (error: any): string[] => {
  const messages: string[] = [];
  collectFromUnknown(messages, error?.response?.data);
  if (messages.length === 0) {
    pushUnique(messages, error?.message);
  }
  return messages;
};

export const getApiErrorMessage = (error: any, fallback = 'Có lỗi xảy ra') => {
  const messages = collectApiErrorMessages(error);
  return messages.length > 0 ? messages.join('\n') : fallback;
};
