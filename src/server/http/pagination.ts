export function pagination(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    meta: { page, page_size: pageSize },
  };
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, page_size: pageSize, total };
}

export function requestAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
