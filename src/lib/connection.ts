import {
  AudioPlayer,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice'
import chalk from 'chalk'
import { VoiceChannel } from 'discord.js'
import { createLogger, getChannelLabel } from '@logger'

export function createConnection(channel: VoiceChannel) {
  const { label } = getChannelLabel(channel)
  const connectionLogger = createLogger(`${label} ${chalk.blue('Connect')}`, 'connect')

  let connection: VoiceConnection
  // Channel/Connection
  const attachChannel = (channel: VoiceChannel, audioPlayer: AudioPlayer) => {
    connectionLogger.info(`Connecting to ${channel.name}`)
    if (connection && connection.joinConfig.channelId === channel.id) {
      connectionLogger.verbose(`Using existing connection for ${channel.name}`)
      return connection
    }
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
    })
    connection.once(VoiceConnectionStatus.Disconnected, () => {
      connectionLogger.info(`Disconnected from ${channel.name}... Destroying connection`)
      connection.destroy()
      connection = undefined
    })
    connection.on(VoiceConnectionStatus.Ready, () => {
      connectionLogger.verbose(`Ready on ${channel.name}`)
      connection.subscribe(audioPlayer)
    })

    return connection
  }

  const getConnection = () => connection

  return { getConnection, attachChannel }
}
