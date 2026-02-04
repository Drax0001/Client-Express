/**
 * GET /api/chatbots - List chatbots with filtering and pagination
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { NextRequest, NextResponse } from "next/server";
import { ChatbotService } from "@/services/chatbot.service";
import { errorHandler } from "@/lib/error-handler";

const chatbotService = new ChatbotService();

/**
 * GET /api/chatbots
 * List chatbots with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build filter object
    const filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.search = search;
    }

    console.log(`API: Get chatbots - page ${page}, limit ${limit}, filter:`, filter);

    // Get chatbots with pagination
    const result = await chatbotService.getChatbots(filter, page, limit);

    console.log(`API: Get chatbots - returning ${result.chatbots.length} chatbots of ${result.pagination.totalCount} total`);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("API: Get chatbots - error:", error);
    return errorHandler(error);
  }
}