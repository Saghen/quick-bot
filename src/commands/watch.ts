import { attachToChannel, isInVoiceChannel } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'
import { createReactor } from '@middleware/reactions'
import { Middleware } from '@middleware/types'

const watch: Middleware = ({ queue, message }, next) => {
  queue.watch(message.member)
  next()
}

export default [isInVoiceChannel, populateQueue, attachToChannel, watch, createReactor('✅')]
