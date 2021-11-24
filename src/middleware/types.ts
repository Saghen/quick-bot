import { Queue } from '@lib/queue'
import { Client, Guild, GuildMember, Message, TextBasedChannels, VoiceChannel } from 'discord.js'

export type Context = {
  command: string
  args: string[]

  message: Message
  member: GuildMember
  channel: TextBasedChannels
  voiceChannel?: VoiceChannel
  guild: Guild
  client: Client

  queue: Queue
}

export type Middleware = (ctx: Context, next: () => Promise<Context>) => any | Promise<any>

export async function runMiddleware(middleware: Middleware[], ctx: Context): Promise<Context> {
  await Promise.resolve().then(() => middleware[0](ctx, () => runMiddleware(middleware.slice(1), ctx)))
  return ctx
}
