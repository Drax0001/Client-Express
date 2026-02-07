import { prisma } from "../../lib/prisma";
import { decryptValue } from "@/lib/encryption";

export type ApiKeyKind = "llm" | "embedding";

export async function getUserApiKey(userId: string, kind: ApiKeyKind) {
  const record = await prisma.userApiKey.findUnique({
    where: { userId_kind: { userId, kind } },
    select: { encryptedKey: true },
  });

  if (!record?.encryptedKey) {
    return null;
  }

  return decryptValue(record.encryptedKey);
}

export async function getUserApiKeys(userId: string) {
  const records = await prisma.userApiKey.findMany({
    where: { userId },
    select: { kind: true, encryptedKey: true },
  });

  return records.reduce(
    (acc, record) => {
      if (record.encryptedKey) {
        acc[record.kind as ApiKeyKind] = decryptValue(record.encryptedKey);
      }
      return acc;
    },
    {} as Partial<Record<ApiKeyKind, string>>,
  );
}
