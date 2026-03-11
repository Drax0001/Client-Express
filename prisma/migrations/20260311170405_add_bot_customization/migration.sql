-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "maxTokens" INTEGER NOT NULL DEFAULT 2048,
ADD COLUMN     "modelId" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
ADD COLUMN     "persona" TEXT,
ADD COLUMN     "responseStyle" TEXT NOT NULL DEFAULT 'balanced',
ADD COLUMN     "systemPrompt" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4;
