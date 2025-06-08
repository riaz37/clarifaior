/**
 * Checks if a value is a plain object (created by the Object constructor or with a null prototype)
 */
export function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) return false;
  
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep merges two objects, similar to Object.assign but recursive
 */
export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const result = { ...target } as any;
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key as keyof T];
      
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        result[key] = [...targetValue, ...sourceValue];
      } else {
        result[key] = sourceValue;
      }
    }
  }
  
  return result as T & U;
}

/**
 * Returns a new object with only the specified keys from the source object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Pick<T, K>);
}

/**
 * Returns a new object with all properties except the specified keys
 */
export function omit<T extends object, K extends keyof T>(
  source: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...source } as Omit<T, K>;
  
  for (const key of keys) {
    delete (result as any)[key];
  }
  
  return result;
}
