// This whole shape (envelope type, whitelist, parsing) is genuinely
// identical to apps/web's copy and now lives in packages/shared —
// re-exported here so every existing import of this file keeps working
// unchanged.
export {
  type PaginatedDto,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  toPaginatedDto,
  parsePageParam,
  parsePageSizeParam,
} from 'shared/pagination';
