import { isInVoiceChannel } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'
import { createReactor } from '@middleware/reactions'
import { Middleware } from '@middleware/types'

const unwatch: Middleware = ({ queue }, next) => {
  queue.unwatch()
  next()
}

export default [isInVoiceChannel, populateQueue, unwatch, createReactor('✅')]
