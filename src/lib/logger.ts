import { createLogger as createWinstonLogger, format, transports, Logger as WinstonLogger } from 'winston'
import Transport from 'winston-stream'
import path from 'path'
import fs from 'fs'

import tripleBeam from 'triple-beam'
import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import { VoiceChannel } from 'discord.js'

const { combine, colorize, label, timestamp, simple, printf } = format

function addToBeginning(label: String) {
  return format((info) => {
    info.level = `${label}`
    return info
  })()
}

function json(replacer, space) {
  return format((info) => {
    info[tripleBeam.MESSAGE] = `${JSON.stringify(info, replacer, space)},`
    return info
  })()
}

function createConsoleTransport(logLabel?: string): transports.ConsoleTransportInstance | void {
  const formatFuncs = [colorize(), simple()]
  if (logLabel) {
    formatFuncs.splice(1, 0, addToBeginning(logLabel))
  }

  return new transports.Console({
    level: process.env.CONSOLE_LOG_LEVEL ?? 'debug',
    format: combine(...formatFuncs),
  })
}

// TODO: Split logs per week
function createFileTransport(fileName?: string, labelText?: string): transports.FileTransportInstance | void {
  const logDir = path.join(__dirname, '../logs')

  try {
    fs.accessSync(logDir)
  } catch {
    try {
      fs.mkdirSync(logDir, { recursive: true })
    } catch (err) {
      console.error(err)
      return
    }
  }

  const formatFuncs = [json(undefined, process.env.NODE_ENV !== 'production' ? 2 : 0), timestamp()]
  if (labelText) formatFuncs.unshift(label({ label: stripAnsi(labelText) }))

  return new transports.File({
    level: process.env.FILE_LOG_LEVEL ?? 'info',
    format: combine(...formatFuncs),
    filename: path.join(logDir, `${fileName ?? 'combined'}.log`),
  })
}

type Pipe = <T>(val: T) => T
type MakePipe = (message: string, ...meta: any) => Pipe
type MakeLogPipe = (level: string) => MakePipe

type Logger = WinstonLogger & {
  makeLogPipe: MakeLogPipe
  makeErrorPipe: MakePipe
  makeInfoPipe: MakePipe
  makeDebugPipe: MakePipe
  makeVerbosePipe: MakePipe
}

export const createLogger = (labelText?: string, fileLabelText: string = labelText) => {
  const logger = createWinstonLogger({
    transports: <Transport[]>(
      [
        createConsoleTransport(labelText),
        createFileTransport('combined', fileLabelText),
        labelText && createFileTransport(fileLabelText, fileLabelText),
      ].filter(Boolean)
    ),
  }) as Logger
  logger.makeLogPipe =
    (level: string) =>
    (message: string, ...meta: any) =>
    (val) => {
      logger.log(level, message.replace(/{{\s*val\s*}}/, String(val)), ...meta)
      if (val instanceof Error) throw val
      return val
    }
  logger.makeErrorPipe = logger.makeLogPipe('error')
  logger.makeInfoPipe = logger.makeLogPipe('info')
  logger.makeDebugPipe = logger.makeLogPipe('debug')
  logger.makeVerbosePipe = logger.makeLogPipe('verbose')
  return logger
}

const logger: Logger = createLogger()
export default logger

const chalkColors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan]
export const getChannelLabel = (channel: VoiceChannel) => {
  const hash = channel.guild.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const chalkColor = chalkColors[hash % chalkColors.length]

  const label = chalkColor(channel.guild.name)

  return { label, rawLabel: channel.guild.name, colorFn: chalkColor }
}
