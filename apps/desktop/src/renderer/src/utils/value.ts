type Value<T> = T | ((...args: any[]) => T);

export const getValue = <
  T extends string | number | boolean | undefined | object
>(
  value: Value<T>,
  ...args: any[]
): T => {
  return typeof value == "function" ? value(...args) : value;
};
