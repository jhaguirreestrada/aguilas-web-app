import { z } from 'zod'
import { handler, readBody } from '@/server/http/handler'
import { AssistantService } from '@/server/modules/assistant/assistant.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1).max(50),
})

const assistant = new AssistantService()

export const POST = handler(async ({ req, user }) => {
  const { messages } = await readBody(req, schema)
  return { reply: await assistant.reply(messages, user.full_name || user.username) }
})
