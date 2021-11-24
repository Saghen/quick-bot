import { URL } from 'url'
import { QueueItem } from '../lib/queue'

import { isValidUrl as defaultIsValidUrl, getAudio as defaultGetAudio } from '../providers/default'
import { isValidUrl as ytIsValidUrl, getAudio as ytGetAudio } from '../providers/youtube'
import { isValidUrl as spotifyIsValidUrl, getAudio as spotifyGetAudio } from '../providers/spotify'
import { Middleware } from '@middleware/types'
import { attachToChannel, isInVoiceChannel, showTyping } from '@middleware/channel'
import { populateQueue } from '@middleware/queue'

function isValidUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (err) {
    return false
  }
}

//-----------------
// Provider Setup
//-----------------
export enum URLType {
  YOUTUBE = 'youtube',
  SPOTIFY = 'spotify',
  DEFAULT = 'default',
  // SOUNDCLOUD = 'soundcloud',
  // FILE = 'file'
}

export type UrlChecker = (url: URL) => boolean
export type AudioGetter = (url: URL) => Promise<QueueItem[]>

const urlTypeCheckers: Record<URLType, UrlChecker> = {
  [URLType.YOUTUBE]: ytIsValidUrl,
  [URLType.SPOTIFY]: spotifyIsValidUrl,
  [URLType.DEFAULT]: defaultIsValidUrl,
}

const audioGetters: Record<URLType, AudioGetter> = {
  [URLType.YOUTUBE]: ytGetAudio,
  [URLType.SPOTIFY]: spotifyGetAudio,
  [URLType.DEFAULT]: defaultGetAudio,
}

function getURLType(url: URL): URLType | undefined {
  return (Object.keys(urlTypeCheckers).find((urlType) => urlTypeCheckers[urlType](url)) as URLType) ?? URLType.DEFAULT
}

function getAudio(url: URL, urlType: URLType): Promise<QueueItem[]> {
  return audioGetters[urlType](url)
}

type play = Middleware
const play: Middleware = async ({ message, args, queue }) => {
  if (!isValidUrl(args[0])) {
    message.reply('Provide an actual url :joy_cat:')
    return
  }
  const url = new URL(args[0])

  const urlType = getURLType(url)
  if (urlType === undefined) {
    message.reply('Provide an actual url :joy_cat:')
  }

  const queueItems = await getAudio(url, urlType)
  for (const item of queueItems) {
    await queue.add(item)
  }

  message.channel.send(`Queued ${queueItems[0].name}`)
}

export default [isInVoiceChannel, populateQueue, attachToChannel, showTyping, play]
