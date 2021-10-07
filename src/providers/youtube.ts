import { getBasicInfo, validateURL } from 'ytdl-core'
import { AudioGetter, UrlChecker } from '../commands/play'
import { QueueItem } from '../lib/queue'

export const isValidUrl: UrlChecker = (url) => validateURL(url.href)

export const getAudio: AudioGetter = async (url): Promise<QueueItem[]> => {
  const info = await getBasicInfo(url.href)
  const audioUrl = info.formats
    .filter((format) => format.mimeType.startsWith('audio'))
    .sort((format) => (format.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? -1 : 1))[0].url
  return [{ name: info.videoDetails.title, url: audioUrl }]
}
