import {
  AudioPlayer,
  AudioResource,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  generateDependencyReport,
  AudioPlayerStatus,
} from '@discordjs/voice'
import chalk from 'chalk'
import { Client, GuildMember, Presence, TextChannel, VoiceChannel } from 'discord.js'

import { getAudio as getSpotifyAudio } from '../providers/spotify'
import { createLogger, getChannelLabel } from './logger'
import { URL } from 'url'
import { createConnection } from './connection'
import { createAudioPlayer, getAudioSource } from './audio-player'
import { createFFMPEGResource } from './resource'

generateDependencyReport()

const queues: Record<string, Queue> = {}

export type QueueItem = {
  url: string
  name: string
  seekable?: boolean
  artists?: string[]
  title?: string
  resource?: AudioResource
}

export type Queue = {
  attachChannel: (channel: VoiceChannel) => VoiceConnection
  getConnection: () => VoiceConnection | undefined
  getAudioPlayer: () => AudioPlayer

  getVolume: () => number
  setVolume: (volume: number) => void
  seek: (seconds: number) => void

  add: (item: QueueItem) => Promise<void>
  remove: (item: QueueItem | number) => Promise<void>
  list: () => QueueItem[]
  clear: () => Promise<void>
  skip: () => Promise<void>

  watch: (user: GuildMember) => void
  unwatch: () => void
}

export function getQueue(channel: VoiceChannel): Queue | undefined {
  return queues[channel.guild.id]
}

export function createQueue(channel: VoiceChannel, textChannel: TextChannel): Queue {
  const { label } = getChannelLabel(channel)
  const queueLogger = createLogger(`${label} ${chalk.green('Queue')}`, 'queue')

  // Use existing queue if available
  if (queues[channel.guild.id]) {
    queueLogger.verbose(`Using existing queue for ${channel.guild.name}`)
    return queues[channel.guild.id]
  }

  queueLogger.info(`Creating queue for ${channel.guild.name}`)
  const internalQueue: QueueItem[] = []
  const audioPlayer = createAudioPlayer(channel, internalQueue)
  const connection = createConnection(channel)

  const add: Queue['add'] = async (item) => {
    queueLogger.info(`Adding ${item.name} to queue`)
    if (!('resource' in item)) {
      item.resource = await getAudioSource(item.url).catch(
        queueLogger.makeErrorPipe('Failed while getting audio source {{val}}')
      )
    }
    internalQueue.push(item)
    if (audioPlayer.getStatus() === AudioPlayerStatus.Idle) {
      queueLogger.debug(`Requesting play of ${item.name}`)
      audioPlayer.play(item.resource)
    }
  }

  const list: Queue['list'] = () => internalQueue.slice()

  const clear: Queue['clear'] = async () => {
    queueLogger.info(`Clearing queue of ${internalQueue.length} items`)
    while (internalQueue.length > 0) internalQueue.pop()
    return audioPlayer.stop()
  }

  const skip: Queue['skip'] = async () => {
    if (internalQueue.length === 0) {
      queueLogger.warn(`Attempted to skip but no items are in queue`)
      return
    }

    queueLogger.info(`Skipping ${internalQueue[0].name}`)
    internalQueue.shift()

    if (internalQueue.length === 0) {
      queueLogger.verbose('No items left in queue... Stopping player')
      return audioPlayer.stop()
    }
    audioPlayer.play(internalQueue[0].resource)
  }

  const remove: Queue['remove'] = async (item: QueueItem | number) => {
    // Convert reference to index
    if (typeof item !== 'number') {
      item = internalQueue.indexOf(item)
      if (item === -1) throw new Error('Item not found in queue')
    }
    if (internalQueue.length <= item) throw new Error('Item out of bounds')

    // Remove the item
    if (item === 0) return skip()
    internalQueue.splice(item, 1)
  }

  let currentWatchUser: GuildMember
  let watchUnsubscriber
  const watch: Queue['watch'] = async (user) => {
    await watchUnsubscriber?.()

    currentWatchUser = user
    const client: Client = globalThis.client

    let currentOpHash
    let lastSyncId
    const watchListener = async (_, presence: Presence) => {
      // Ignore if not the right user
      if (presence.member.id !== currentWatchUser.id) return

      // Ignore non-spotify
      const spotifyPresence = presence.activities.find((activity) => activity.id === 'spotify:1')
      if (!spotifyPresence) return

      // Ignore if the same song
      if (lastSyncId === spotifyPresence.syncId) return
      lastSyncId = spotifyPresence.syncId

      const opHash = Math.round(Math.random() * Number.MAX_SAFE_INTEGER)
        .toString(16)
        .slice(0, 5)
      currentOpHash = opHash

      const queueItems = await getSpotifyAudio(new URL(`https://open.spotify.com/track/${spotifyPresence.syncId}`))
      if (currentOpHash !== opHash) return
      // await clear()
      await add(queueItems[0])
    }

    client.on('presenceUpdate', watchListener)
    watchUnsubscriber = () => client.off('presenceUpdate', watchListener)
  }

  const unwatch: Queue['unwatch'] = () => {
    watchUnsubscriber()
  }

  const queue = {
    attachChannel: (channel: VoiceChannel) => connection.attachChannel(channel, audioPlayer.getAudioPlayer()),
    getConnection: connection.getConnection,
    getAudioPlayer: audioPlayer.getAudioPlayer,

    getVolume: audioPlayer.getVolume,
    setVolume: audioPlayer.setVolume,
    seek: audioPlayer.seek,

    add,
    list,
    clear,
    skip,
    remove,

    watch,
    unwatch,
  }

  queues[channel.guild.id] = queue

  return queue
}
