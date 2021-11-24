import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice'
import { spawn } from 'child_process'

const FFMPEG_PCM_ARGUMENTS = ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2']
const FFMPEG_OPUS_ARGUMENTS = [
  '-analyzeduration',
  '0',
  '-loglevel',
  '0',
  '-acodec',
  'libopus',
  '-f',
  'opus',
  '-ar',
  '48000',
  '-ac',
  '2',
]

interface CreateFFmpegResourceOptions {
  /**
   * Arguments to be used before the '-i' argument in FFMPEG.
   */
  arguments?: string[]
  /**
   * Whether or not inline volume should be enabled. If enabled, you will be able to change the volume
   * of the stream on-the-fly. However, this also increases the performance cost of playback. Defaults to `false`.
   */
  inlineVolume?: boolean
  /**
   * Time to seek in audio resource (in ms)
   */
  seek?: number
}

export function createFFMPEGResource(input: string, options: CreateFFmpegResourceOptions = {}): AudioResource {
  const finalArgs: string[] = []

  if (options.arguments && options.arguments.length !== 0) {
    finalArgs.push(...options.arguments)
  }
  if (options.seek) {
    finalArgs.push('-ss', `${options.seek}`, '-accurate_seek')
  }
  finalArgs.push('-i', `"${input}"`)
  options.inlineVolume ? finalArgs.push(...FFMPEG_PCM_ARGUMENTS) : finalArgs.push(...FFMPEG_OPUS_ARGUMENTS)

  console.log(`ffmpeg ${finalArgs.join(' ')} -`)
  const proc = spawn(`ffmpeg ${finalArgs.join(' ')} -`, { shell: true })
  proc.stderr.on('data', console.error)

  return createAudioResource(proc.stdout, {
    inputType: options.inlineVolume ? StreamType.Raw : StreamType.OggOpus,
    inlineVolume: options.inlineVolume || false,
  })
}
