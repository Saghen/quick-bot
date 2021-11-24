import { GuildEmoji } from 'discord.js'
import { Middleware } from './types'

export const createReactor: (emoji: GuildEmoji | string) => Middleware =
  (emoji) =>
  ({ message }) => {
    message.react(emoji)
  }
