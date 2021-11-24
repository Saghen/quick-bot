import { AudioGetter, UrlChecker } from '@commands/play'
import { QueueItem } from '@lib/queue'
import YoutubeDlWrap from 'youtube-dl-wrap'
import { exec } from 'child_process'

const youtubeDlWrap = new YoutubeDlWrap()

export const isValidUrl: UrlChecker = () => true

export const getAudio: AudioGetter = async (url): Promise<QueueItem[]> => {
  const [title, audioUrl] = await new Promise<string[]>((resolve, reject) =>
    exec(`youtube-dl -s -e -g ${url.href}`, (err, stdout, stderr) => {
      if (err || stderr) reject(err || stderr)
      resolve(stdout.split('\n').map((str) => str.trim()))
    })
  )

  const item: QueueItem = {
    name: `${title} from ${url.hostname}`,
    url: audioUrl.trim(),
  }

  return [item]
}

youtubeDlWrap.execStream(['https://www.youtube.com/watch?v=aqz-KE-bpKQ', '-f', 'best[ext=mp4]'])
