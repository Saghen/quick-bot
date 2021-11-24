import { isInVoiceChannel } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'
import { createReactor } from '@middleware/reactions'
import { Middleware } from '@middleware/types'

const skip: Middleware = ({ message, queue }, next) => {
  if (queue.list().length === 0) return message.reply('No items in queue')
  queue.skip()

  next()
}

export default [isInVoiceChannel, populateQueue, skip, createReactor('✅')]
