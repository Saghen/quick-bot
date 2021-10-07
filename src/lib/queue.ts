import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  generateDependencyReport,
} from '@discordjs/voice'
import { VoiceChannel } from 'discord.js/typings/index.js'

import { pipeline } from 'stream'
import { promisify } from 'util'
import fetch from 'node-fetch'
import request from 'request'
import { URL } from 'url'

const streamPipeline = promisify(pipeline)

console.log(generateDependencyReport())

const connections: Record<string, VoiceConnection> = {}

function addStateListener(channel: VoiceChannel, connection: VoiceConnection) {
  const stateListener = (_, { status }) => {
    if (status === VoiceConnectionStatus.Destroyed || status === VoiceConnectionStatus.Disconnected) {
      delete connections[channel.id]
      connection.off('stateChange', stateListener)
    }
  }
  connection.on('stateChange', stateListener)
  return () => connection.off('stateChange', stateListener)
}

export type QueueItem = { url: string; name: string; artists?: string[]; title?: string; resource?: AudioResource }
type InternalQueueItem = QueueItem & { resource: AudioResource }

type Queue = {
  add: (item: QueueItem) => Promise<void>
  remove: (item: QueueItem) => Promise<void>
  list: () => QueueItem[]
  clear: () => Promise<void>
  destroy: () => Promise<void>
  connection: VoiceConnection
  audioPlayer: AudioPlayer
}

export async function getAudioSource(url: string) {
  return createAudioResource(url)
}

export function createQueue(channel: VoiceChannel): Queue {
  // TODO: rejoin if not connected?
  if (connections[channel.id]) return

  // Connection
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
  })
  connections[channel.id] = connection

  // Audio player
  const audioPlayer = createAudioPlayer()

  // Connection listeners
  connection.once(VoiceConnectionStatus.Destroyed, () => {
    delete connections[channel.id]
  })
  connection.once(VoiceConnectionStatus.Disconnected, () => {
    connection.destroy()
  })
  connection.on(VoiceConnectionStatus.Ready, () => {
    console.debug(`READY ON ${channel.name} ${channel.id}`)
    connection.subscribe(audioPlayer)
  })

  // Queue code
  const internalQueue: InternalQueueItem[] = []

  const add: Queue['add'] = async (item) => {
    if (!('resource' in item)) {
      item.resource = await getAudioSource(item.url)
    }
    internalQueue.push(item as InternalQueueItem)
    audioPlayer.play(item.resource)
  }

  const list: Queue['list'] = () => internalQueue.slice()

  return {
    add,
    list,
    connection,
    audioPlayer,
  }
}
