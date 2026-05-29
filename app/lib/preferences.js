const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function normalizeWalletAddress(address) {
  if (!address || typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!ETH_ADDRESS_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function preferenceFieldsFromRecord(record) {
  return {
    categories: record?.categories ?? "",
    subCategories: record?.subCategories ?? "",
    tags: record?.tags ?? "",
    liquidityScale: record?.liquidityScale ?? "",
    timeframes: record?.timeframes ?? "",
  };
}

export function sanitizePreferencePayload(body) {
  const fields = [
    "categories",
    "subCategories",
    "tags",
    "liquidityScale",
    "timeframes",
  ];

  const result = {};
  for (const field of fields) {
    result[field] =
      typeof body?.[field] === "string" ? body[field].trim() : "";
  }
  return result;
}
