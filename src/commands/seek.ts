import { attachToChannel, isInVoiceChannel } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'
import { Middleware } from '@middleware/types'

const seek: Middleware = async ({ message, args, queue }) => {
  if (!args[0]) {
    message.channel.send('Provide a time :joy_cat:')
    return
  }

  // 500
  if (!isNaN(Number(args[0]))) {
    queue.seek(Number(args[0]))
    return
  }

  // 10:40
  const parts = args[0].split(':').map(Number)
  if (!parts.some(isNaN)) {
    parts.reverse()
    const seconds = parts.reduce((seconds, part, i) => seconds + part * 60 ** i, 0)
    queue.seek(seconds)
    return
  }

  message.channel.send(`Give a time like 10:40`)
}

export default [isInVoiceChannel, populateQueue, attachToChannel, seek]
