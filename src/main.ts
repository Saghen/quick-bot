import { config } from 'dotenv'
import { REST } from '@discordjs/rest'
import { Client, Intents } from 'discord.js'
import { Routes } from 'discord-api-types/v9'

import play from './commands/play'

config()

const commands = {
  p: play,
  play: play,
}

console.log(process.env.TOKEN)

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_WEBHOOKS,
  ],
})

async function init() {
  console.log('Started refreshing application (/) commands.')

  /*
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
    body: commands,
  })
  */

  //  console.log('Successfully reloaded application (/) commands.')

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
  })

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return

    console.log(interaction)

    if (interaction.commandName === 'ping') {
      await interaction.reply('Pong!')
    }
  })

  client.on('message', async (message) => {
    if (!message.content.startsWith('-')) return
    const command = message.content.slice(1).split(' ', 1)[0]
    const args = message.content.slice(1).split(' ').filter(Boolean).slice(1)
    if (commands[command]) {
      return commands[command](client, message, command, args)
    }
    message.reply('Command not found')
  })

  client.login(process.env.TOKEN)
}

init()
