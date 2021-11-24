import logger from '@lib/logger'
import { StageChannel, VoiceChannel } from 'discord.js'
import { Middleware } from './types'

export const isInVoiceChannel: Middleware = ({ message }, next) => {
  const channel = message.member?.voice?.channel as VoiceChannel
  if (!channel || !channel.isVoice()) {
    message.reply("You're not in a channel bozo")
    return
  }
  if (!channel.joinable || channel instanceof StageChannel) {
    message.reply('Make me admin I cant join u')
    return
  }
  next()
}

export const attachToChannel: Middleware = ({ voiceChannel, queue }, next) => {
  if (!voiceChannel) throw new Error('The context must have a voice channel')
  if (!queue) throw new Error('The context must have a queue')
  queue.attachChannel(voiceChannel)

  next()
}

export const showTyping: Middleware = async ({ channel }, next) => {
  await channel.sendTyping()
  try {
    await next()
  } catch (err) {
    console.error(err)
    await channel.send('!!! RIP BOZO BOT DOWN')
  }
}
