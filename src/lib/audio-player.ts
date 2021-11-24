import { AudioPlayerStatus, AudioResource, createAudioPlayer as createInternalAudioPlayer } from '@discordjs/voice'
import chalk from 'chalk'
import { VoiceChannel } from 'discord.js'
import { createLogger, getChannelLabel } from './logger'
import { QueueItem } from './queue'
import { createFFMPEGResource } from './resource'

export async function getAudioSource(url: string, options?: { seek?: number; volume?: number }) {
  const resource = createFFMPEGResource(url, { ...options, inlineVolume: true })
  if (options?.volume) resource.volume.setVolume(options.volume)
  return resource
}

export function createAudioPlayer(channel: VoiceChannel, internalQueue: QueueItem[]) {
  const { label } = getChannelLabel(channel)
  const audioLogger = createLogger(`${label} ${chalk.magenta('Audio')}`, 'audio')

  let volume = 0.2 ** 2

  const audioPlayer = createInternalAudioPlayer()
  audioPlayer.on(AudioPlayerStatus.Buffering, () => {
    audioLogger.debug(`Buffering ${internalQueue[0].name}`)
  })
  audioPlayer.on(AudioPlayerStatus.Playing, () => {
    audioLogger.info(`Playing ${internalQueue[0].name}`)
  })
  audioPlayer.on(AudioPlayerStatus.Idle, async () => {
    if (internalQueue.length === 0 || !internalQueue[0].resource.ended) return

    audioLogger.verbose(`${internalQueue[0].name} Ended`)
    internalQueue.shift()
    audioLogger.verbose(`Found ${internalQueue.length} in queue`)
    if (internalQueue.length === 0) {
      audioLogger.verbose(`Queue is empty... Stopping`)
      return
    }
    internalQueue[0].resource.volume.setVolume(volume)
    await new Promise(resolve => setTimeout(resolve, 200))
    play(internalQueue[0].resource)
  })
  audioPlayer.on('error', (err) => {
    audioLogger.error(err)
  })

  // TODO: Async return
  const play = async (resource: AudioResource) => {
    resource.volume.setVolume(volume)
    await new Promise((resolve) => setTimeout(resolve, 200))
    return audioPlayer.play(resource)
  }

  const stop = async () => {
    audioLogger.verbose(`Stopping player`)
    audioPlayer.stop()

    if (audioPlayer.state.status === AudioPlayerStatus.Idle) return
    return new Promise<void>((resolve) => audioPlayer.on(AudioPlayerStatus.Idle, () => resolve()))
  }
  const getStatus = () => audioPlayer.state.status
  const isPlaying = () => getStatus() !== AudioPlayerStatus.Playing && getStatus() !== AudioPlayerStatus.Buffering

  const getVolume = () => Math.sqrt(volume)
  // TODO: Async return
  const setVolume = (newVolume: number) => {
    audioLogger.info(`Setting volume to ${Math.ceil(newVolume * 100)}%`)
    volume = newVolume ** 2
    if (internalQueue.length === 0) return
    internalQueue[0].resource.volume.setVolume(volume)

    if (
      audioPlayer.state.status !== AudioPlayerStatus.Playing &&
      audioPlayer.state.status !== AudioPlayerStatus.Buffering
    ) {
      return
    }

    audioLogger.verbose(`Player running... Updating volume`)
    audioPlayer.play(internalQueue[0].resource)
  }

  const seek = async (seconds: number) => {
    if (internalQueue.length === 0) {
      audioLogger.info(`Tried to seek to ${seconds} seconds but no items were in queue`)
      throw new Error('No items in queue to seek')
    }
    audioLogger.info(`Seeking to ${seconds} seconds...`)

    // Create new resource at time
    const newResource = await getAudioSource(internalQueue[0].url, { seek: seconds, volume })
    internalQueue[0].resource = newResource

    // Give FFMPEG time to build a buffer
    await new Promise((resolve) => setTimeout(resolve, 200))
    return audioPlayer.play(internalQueue[0].resource)
  }

  return {
    getAudioPlayer: () => audioPlayer,
    play,
    stop,
    getStatus,
    isPlaying,
    getVolume,
    setVolume,
    seek,
  }
}
