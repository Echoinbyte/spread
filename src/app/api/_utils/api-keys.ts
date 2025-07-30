import crypto from "crypto";

export function generateSpreadKey(spreadName: string): string {
  const masterKey = process.env.SPREAD_MASTER_KEY;

  if (!masterKey) {
    throw new Error("SPREAD_MASTER_KEY environment variable is required");
  }

  const hash = crypto
    .createHmac("sha256", masterKey)
    .update(spreadName)
    .digest("hex");

  return hash.substring(0, 32);
}

export function validateSpreadKey(
  spreadName: string,
  providedKey: string
): boolean {
  try {
    const expectedKey = generateSpreadKey(spreadName);
    return crypto.timingSafeEqual(
      Buffer.from(expectedKey, "utf8"),
      Buffer.from(providedKey, "utf8")
    );
  } catch {
    return false;
  }
}

export function createApiKeyForSpread(spreadName: string): string {
  return generateSpreadKey(spreadName);
}
