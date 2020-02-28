const Telegraf = require('telegraf')
const Scene = require('telegraf/scenes/base')
const Extra = require('telegraf/extra')
const getMessage = new Scene('getMessage')
const functions = require('./functions')
const data = require('./data')
const bot = new Telegraf(data.token)

getMessage.enter(async (ctx) => {
  ctx.reply("Пишите сообщение:")
})

getMessage.on('message', async (ctx) => {
  try {
    for (let chat of data.chats) {
      const mess = await bot.telegram.sendCopy(chat, ctx.message)
      await bot.telegram.pinChatMessage(
        chat, mess.message_id,
        Extra.notifications(false)
      )
    }
    await ctx.reply('Отправлено ✅')
    ctx.scene.leave()
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

module.exports = getMessage