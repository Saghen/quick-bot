import { createQueue, getQueue } from '@lib/queue'
import { TextChannel } from 'discord.js'
import { Middleware } from './types'

export const populateQueue: Middleware = (ctx, next) => {
  if (!ctx.voiceChannel) throw new Error('The context must have a voice channel')
  ctx.queue = getQueue(ctx.voiceChannel) ?? createQueue(ctx.voiceChannel, ctx.channel as TextChannel)
  next()
}
