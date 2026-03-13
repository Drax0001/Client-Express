import { prisma } from "../../lib/prisma";

// Core Pricing Tiers defined for the Cameroonian market (XAF)
// All sizes are in Bytes. All chars are approximate LLM token tracking equivalents.
export const PLAN_LIMITS = {
    FREE: {
        maxProjects: 1,
        maxSourcesTotal: 999999,
        maxMessagesPerMonth: 50,
        maxSourceSizeBytes: 2 * 1024 * 1024,  // 2MB limit per upload
        maxSourceChars: 20000,                // Extract cutoff protect
    },
    PRO: {
        maxProjects: 5,
        maxSourcesTotal: 999999,
        maxMessagesPerMonth: 1000,
        maxSourceSizeBytes: 10 * 1024 * 1024, // 10MB limit per upload
        maxSourceChars: 100000,
    },
    BUSINESS: {
        maxProjects: 999999, // practically unlimited
        maxSourcesTotal: 999999,
        maxMessagesPerMonth: 999999,
        maxSourceSizeBytes: 50 * 1024 * 1024, // 50MB per upload
        maxSourceChars: 500000,
    }
};

/**
 * Initializes or fetches a user's subscription and monthly usage tracker.
 */
export async function getUserPlanAndUsage(userId: string) {
    // Verify the user actually exists in the database first
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });

    if (!userExists) {
        // User ID from JWT doesn't match any DB record — return safe defaults
        return {
            plan: "FREE" as const,
            limits: PLAN_LIMITS.FREE,
            usage: {
                id: "",
                userId,
                messagesThisMonth: 0,
                sourcesThisMonth: 0,
                resetDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
    }

    // Parallel fetch for speed
    const [sub, usage] = await Promise.all([
        prisma.subscription.findUnique({ where: { userId } }),
        prisma.usageTracker.findUnique({ where: { userId } })
    ]);

    // Handle plan fallbacks (default to FREE if no active sub or expired)
    let plan = "FREE" as "FREE" | "PRO" | "BUSINESS";
    if (sub && sub.status === "active") {
        // If it has an expiry date, check if it's expired
        if (!sub.expiresAt || new Date() < sub.expiresAt) {
            plan = sub.plan;
        }
    }

    // Handle usage tracker creation or reset
    const now = new Date();
    let currentUsage = usage;
    if (!currentUsage) {
        // Determine end of current month for reset
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        currentUsage = await prisma.usageTracker.create({
            data: { userId, resetDate }
        });
    } else if (now > currentUsage.resetDate) {
        // Reset limits at start of billing cycle (monthly)
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        currentUsage = await prisma.usageTracker.update({
            where: { id: currentUsage.id },
            data: { messagesThisMonth: 0, sourcesThisMonth: 0, resetDate }
        });
    }

    return { plan, limits: PLAN_LIMITS[plan], usage: currentUsage };
}

/**
 * Check if the user is allowed to create another project.
 */
export async function checkProjectLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
    const { plan, limits } = await getUserPlanAndUsage(userId);
    const currentProjects = await prisma.project.count({ where: { userId } });

    if (currentProjects >= limits.maxProjects) {
        return {
            allowed: false,
            error: `You have reached the ${plan} plan limit of ${limits.maxProjects} project(s). Please upgrade to create more.`
        };
    }
    return { allowed: true };
}

/**
 * Check if the user is allowed to upload/scrape another source (Doc or URL).
 */
export async function checkSourceLimit(
    userId: string,
    projectId: string,
    sizeBytes?: number
): Promise<{ allowed: boolean; error?: string }> {
    const { plan, limits } = await getUserPlanAndUsage(userId);

    // 1. Check size limits (if providing file bytes)
    if (sizeBytes && sizeBytes > limits.maxSourceSizeBytes) {
        const limitMB = Math.round(limits.maxSourceSizeBytes / (1024 * 1024));
        return {
            allowed: false,
            error: `Files on the ${plan} plan are limited to ${limitMB}MB. Please upgrade or compress your file.`
        };
    }

    // 2. Check total sources in this project
    const currentSources = await prisma.document.count({ where: { projectId } });
    if (currentSources >= limits.maxSourcesTotal) {
        return {
            allowed: false,
            error: `You have reached the ${plan} plan limit of ${limits.maxSourcesTotal} sources in this project. Please upgrade.`
        };
    }

    return { allowed: true };
}

/**
 * Track a new source upload.
 */
export async function trackSourceUpload(userId: string) {
    const { usage } = await getUserPlanAndUsage(userId);
    await prisma.usageTracker.update({
        where: { id: usage.id },
        data: { sourcesThisMonth: { increment: 1 } }
    });
}

/**
 * Check if the user is allowed to send a chat message, and increment if so.
 */
export async function checkAndTrackMessageLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
    const { plan, limits, usage } = await getUserPlanAndUsage(userId);

    if (usage.messagesThisMonth >= limits.maxMessagesPerMonth) {
        return {
            allowed: false,
            error: `You have reached your monthly limit of ${limits.maxMessagesPerMonth} messages on the ${plan} plan. Please upgrade.`
        };
    }

    // Atomically increment message count
    await prisma.usageTracker.update({
        where: { id: usage.id },
        data: { messagesThisMonth: { increment: 1 } }
    });

    return { allowed: true };
}
