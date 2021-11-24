import 'dotenv/config'
import { Client, Intents, Message, TextChannel, VoiceChannel } from 'discord.js'
import logger from '@logger'

import play from './commands/play'
import volume from './commands/volume'
import watch from './commands/watch'
import unwatch from './commands/unwatch'
import skip from './commands/skip'
import seek from './commands/seek'
import { Context, Middleware, runMiddleware } from '@middleware/types'

const commands: Record<string, Middleware[]> = {
  p: play,
  play,
  paly: play,
  v: volume,
  vol: volume,
  volume,
  s: skip,
  skip,
  sikp: skip,
  seek,
  w: watch,
  watch,
  unwatch,
}

// const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_PRESENCES,
  ],
})
globalThis.client = client

async function init() {
  logger.info('Starting bot...')

  client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`)
  })

  client.on('message', async (message) => {
    if (!message.content.startsWith('-')) return
    const commandText = message.content.slice(1).split(' ', 1)[0]
    const args = message.content.slice(1).split(' ').filter(Boolean).slice(1)

    const ctx = {
      args,
      command: commandText,
      member: message.member,
      channel: message.channel,
      voiceChannel: message.member?.voice?.channel as VoiceChannel,
      message,
      guild: (message.channel as TextChannel).guild,
      client,
    } as Context

    const command = commands[commandText]

    if (!command) {
      message.react('❎')
      return
    }

    await runMiddleware(command, ctx)
  })

  client.login(process.env.TOKEN)
}

init()
