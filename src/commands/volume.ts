import { isInVoiceChannel } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'
import { createReactor } from '@middleware/reactions'
import { Middleware } from '@middleware/types'
import { StageChannel, VoiceChannel } from 'discord.js'
import { createQueue, getQueue } from '../lib/queue'

const volume: Middleware = ({ message, args, queue }, next) => {
  const volume = Number(args[0])
  if (isNaN(volume)) {
    message.reply('Give real numbers dumbass')
    return
  }
  if (volume > 100 || volume < 0) {
    message.reply('Between 0 and 100')
    return
  }

  queue.setVolume(volume <= 1 ? volume : volume / 100)
  next()
}

export default [isInVoiceChannel, populateQueue, volume, createReactor('✅')]
