import { prisma } from "../../lib/prisma";
import * as bcrypt from "bcrypt";

/**
 * Helper to authenticate requests using an API Key.
 * Looks for the Authorization header: Bearer ce_abc123...
 * Returns the authenticated userId or null.
 */
export async function authenticateApiKey(request: Request): Promise<{ userId: string } | null> {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ce_")) {
            return null;
        }

        const rawKey = authHeader.slice(7).trim(); // strip "Bearer "
        
        // Find keys matching the prefix to prevent timing attacks / scan all keys
        // The prefix is the first 11 characters, e.g., "ce_abc12345"
        const prefix = rawKey.slice(0, 11);
        const keys = await prisma.apiKey.findMany({ 
            where: { prefix } 
        });

        for (const key of keys) {
            const isMatch = await bcrypt.compare(rawKey, key.keyHash);
            if (isMatch) {
                // Check expiry if it exists
                if (key.expiresAt && key.expiresAt < new Date()) {
                    return null; // Key expired
                }

                // Update last used timestamp stat in the background
                prisma.apiKey.update({ 
                    where: { id: key.id }, 
                    data: { lastUsedAt: new Date() }
                }).catch(console.error);

                return { userId: key.userId };
            }
        }
        
        return null;
    } catch (error) {
        console.error("API Key authentication error:", error);
        return null;
    }
}
