import { createAudioPlayer } from '@discordjs/voice'
import { StageChannel } from 'discord.js/src/index.js'
import { Client, Message, VoiceChannel } from 'discord.js/typings/index.js'
import { URL } from 'url'
import { getBasicInfo, validateURL as validateYTURL } from 'ytdl-core'
import { createQueue, QueueItem } from '../lib/queue'

import { isValidUrl as ytIsValidUrl, getAudio as ytGetAudio } from '../providers/youtube'
import { isValidUrl as spotifyIsValidUrl, getAudio as spotifyGetAudio } from '../providers/spotify'

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
  // SOUNDCLOUD = 'soundcloud',
  // FILE = 'file'
}

export type UrlChecker = (url: URL) => boolean
export type AudioGetter = (url: URL) => Promise<QueueItem[]>

const urlTypeCheckers: Record<URLType, UrlChecker> = {
  [URLType.YOUTUBE]: ytIsValidUrl,
  [URLType.SPOTIFY]: spotifyIsValidUrl,
}

const audioGetters: Record<URLType, AudioGetter> = {
  [URLType.YOUTUBE]: ytGetAudio,
  [URLType.SPOTIFY]: spotifyGetAudio,
}

function getURLType(url: URL): URLType | undefined {
  return Object.keys(urlTypeCheckers).find((urlType) => urlTypeCheckers[urlType](url)) as URLType | undefined
}

function getAudio(url: URL, urlType: URLType): Promise<QueueItem[]> {
  return audioGetters[urlType](url)
}

export default async function play(client: Client, message: Message, command: 'p' | 'play', args: string[]) {
  const channel = message.member?.voice?.channel
  if (!channel || !channel.isVoice()) {
    message.reply("You're not in a channel bozo")
    return
  }
  if (!channel.joinable || channel instanceof StageChannel) {
    message.reply('Make me admin I cant join u')
    return
  }

  const queue = createQueue(channel as VoiceChannel)

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

  message.reply('fuck off')
}
