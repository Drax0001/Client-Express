/**
 * ConversationService tests
 */

import { ConversationService } from "../conversation.service"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

describe("ConversationService", () => {
  let service: ConversationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ConversationService()
  })

  it("getOrCreateConversation returns existing when found", async () => {
    const prisma = require("@/lib/prisma").prisma
    prisma.conversation.findFirst.mockResolvedValue({ id: "conv-1" })
    const result = await service.getOrCreateConversation("bot-1", "default", "conv-1")
    expect(result).toEqual({ id: "conv-1", isNew: false })
  })

  it("getOrCreateConversation creates new when not found", async () => {
    const prisma = require("@/lib/prisma").prisma
    prisma.conversation.findFirst.mockResolvedValue(null)
    prisma.conversation.create.mockResolvedValue({ id: "conv-new" })
    const result = await service.getOrCreateConversation("bot-1", "default")
    expect(result).toEqual({ id: "conv-new", isNew: true })
  })

  it("addMessage creates message", async () => {
    const prisma = require("@/lib/prisma").prisma
    prisma.chatMessage.create.mockResolvedValue({ id: "msg-1", role: "user", content: "Hi" })
    const result = await service.addMessage({
      conversationId: "conv-1",
      role: "user",
      content: "Hi",
    })
    expect(result.content).toBe("Hi")
  })

  it("listConversations returns paginated list", async () => {
    const prisma = require("@/lib/prisma").prisma
    prisma.conversation.findMany.mockResolvedValue([
      { id: "c1", title: "Conv 1", messageCount: 5 },
    ])
    prisma.conversation.count.mockResolvedValue(1)
    const result = await service.listConversations("bot-1", "default", 1, 20)
    expect(result.conversations).toHaveLength(1)
    expect(result.pagination.totalCount).toBe(1)
  })

  it("deleteConversation removes messages and conversation", async () => {
    const prisma = require("@/lib/prisma").prisma
    prisma.chatMessage.deleteMany.mockResolvedValue({ count: 2 })
    prisma.conversation.deleteMany.mockResolvedValue({ count: 1 })
    const result = await service.deleteConversation("conv-1")
    expect(result.deleted).toBe(true)
  })
})
