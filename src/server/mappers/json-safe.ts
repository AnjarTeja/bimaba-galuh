export function safeJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) => {
      if (typeof entry === "bigint") {
        return entry.toString();
      }
      if (
        entry !== null &&
        typeof entry === "object" &&
        "toNumber" in entry &&
        typeof entry.toNumber === "function"
      ) {
        return entry.toNumber();
      }
      return entry;
    }),
  ) as T;
}
