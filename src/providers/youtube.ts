import { getAudioSource } from '@lib/audio-player'
import { validateURL, chooseFormat, getInfo } from 'ytdl-core'
import { AudioGetter, UrlChecker } from '../commands/play'
import { QueueItem } from '../lib/queue'

export const isValidUrl: UrlChecker = (url) => validateURL(url.href)

export const getAudio: AudioGetter = async (url): Promise<QueueItem[]> => {
  const info = await getInfo(url.href)

  const format =
    info.formats
      .filter((format) => format.mimeType.startsWith('audio'))
      .sort((format) => (format.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? -1 : 1))[0] ?? chooseFormat(info.formats)

  // @ts-ignore
  const audioUrl = format.url

  const startTime = getStartTime(url)
  const item: QueueItem = { name: info.videoDetails.title, url: audioUrl }
  if (startTime > 0) {
    item.resource = await getAudioSource(item.url, { seek: startTime })
  }

  return [item]
}

export const genericGetAudio: AudioGetter = async (url): Promise

export const getStartTime = (url: URL) => {
  if (!url.searchParams.has('t')) return 0
  const value = url.searchParams.get('t')
  if (!isNaN(Number(value))) return Number(value)
  const parts = value.split(/[0-9]+\w/).filter(Boolean)
  const seconds = parts.reduce(
    (seconds, part) =>
      (part.includes('m') ? 60 : part.includes('h') ? 60 * 60 : 1) * Number(part.slice(0, -1)) + seconds,
    0
  )
  return seconds
}
