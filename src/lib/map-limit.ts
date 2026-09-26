export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Math.min(Math.max(1, limit), items.length);
  let failed = false;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (!failed && cursor < items.length) {
        const index = cursor;
        cursor += 1;
        try {
          results[index] = await mapper(items[index] as T, index);
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
    }),
  );
  // Do not start cleanup/refunds while another worker can still write files.
  if (failed) throw failure;
  return results;
}
