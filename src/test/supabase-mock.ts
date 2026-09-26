export type QueryResult = { data: unknown; error?: unknown };

export function createQueryBuilder(result: QueryResult | (() => QueryResult)) {
  const resolve = () => (typeof result === "function" ? result() : result);
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    eq: () => builder,
    gt: () => builder,
    is: () => builder,
    limit: () => builder,
    order: () => builder,
    maybeSingle: async () => resolve(),
    single: async () => resolve(),
    then(
      onfulfilled: (value: QueryResult) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(resolve()).then(onfulfilled, onrejected);
    },
  };
  return builder;
}

export function createStorageMock(options?: {
  download?: (
    bucket: string,
    path: string,
  ) => Promise<{ data: { arrayBuffer: () => Promise<ArrayBuffer> } | null; error: unknown }>;
  upload?: (bucket: string, path: string) => Promise<{ error: unknown }>;
}) {
  return {
    from(bucket: string) {
      return {
        info: async (path: string) => {
          const result = await options?.download?.(bucket, path);
          return result?.data ? { data: { size: (await result.data.arrayBuffer()).byteLength }, error: null } : { data: null, error: { message: "missing" } };
        },
        download: (path: string) =>
          options?.download
            ? options.download(bucket, path)
            : Promise.resolve({ data: null, error: { message: "missing" } }),
        upload: (path: string) =>
          options?.upload ? options.upload(bucket, path) : Promise.resolve({ error: null }),
      };
    },
  };
}

export function createSupabaseMock(options: {
  user?: { id: string; email?: string | null } | null;
  from?: (table: string) => ReturnType<typeof createQueryBuilder>;
  storage?: ReturnType<typeof createStorageMock>;
  rpc?: (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }>;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: options.user ?? null } }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) =>
      options.from ? options.from(table) : createQueryBuilder({ data: null, error: null }),
    storage: options.storage ?? createStorageMock(),
    rpc: options.rpc ?? (async () => ({ data: null, error: null })),
  };
}

export async function readJson(response: Response) {
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
