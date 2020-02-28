const Telegraf = require('telegraf')
const mongo = require('mongodb').MongoClient
const data = require('./data')
const text = require('./text')
const functions = require('./functions')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const publish = require('./publishScene')
const stage = new Stage()
const bot = new Telegraf(data.token)
const { telegram } = bot

stage.register(publish)
bot.use(session())
bot.use(stage.middleware())

mongo.connect(data.mongoLink, { useUnifiedTopology: true }, (err, client) => {
  if (err) {
    return functions.sendError(err)
  }

  bot.context.db = client.db('chatAdmin')
  bot.startPolling()
})


bot.hears(/^!ban [0-9]{1,3}[mhdw]{1}$/i, async (ctx) => {
  if (await functions.checkConds(ctx)) {
    return
  }

  const date = ctx.message.text.length > 5 ? functions.getDate(ctx.message.text.substr(5)) : null

  await functions.punishUser(ctx, date, 'kickChatMember')
})

bot.hears(/^!mute [0-9]{1,3}[mhdw]{1}.*$/i, async (ctx) => {
  try {
    if (await functions.checkConds(ctx)) {
      return
    }
  
    const date = ctx.message.text.length > 5 ? functions.getDate(ctx.message.text.substr(6)) : null
  
    await functions.punishUser(ctx, date, 'restrictChatMember')

    
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears('!unmute', async (ctx) => {
  if (await functions.checkConds(ctx)) {
    return
  }

  await functions.unMuteUser(ctx)
})

bot.command('chatid', (ctx) => ctx.reply(ctx.chat.id))

bot.on('new_chat_members', async (ctx) => {
  try {
    if (!data.chats.includes(ctx.chat.id)) {
      return 
    }

    const userId = ctx.update.message.from.id
    const oldUser = await ctx.db.collection('oldUsers').findOne({ userId: userId })
    if (oldUser != null) {
      return
    }
  
    await functions.punishUser(ctx, null, 'restrictChatMember')

    const user = ctx.update.message.from
    await ctx.reply(
      text.hello.replace('%link%', `<a href="tg://user?id=${user.id}">${user.first_name}</a>`),
      Extra.markup(Markup.inlineKeyboard([
        [Markup.urlButton('📖 Правила', 'https://teletype.in/@ramziddin/BkF3SRwoB')],
        [Markup.callbackButton('✅ Прочитал, согласен', `accept_${userId}_${ctx.message.message_id}`)]
      ])).HTML()
    )
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.action(/accept_[0-9]*_[0-9]*/, async (ctx) => {
  const query = ctx.update.callback_query
  const match = query.data.match(/_[0-9]*_[0-9]*/)[0].substr(1)
  const requiredId = +match.substring(0, match.indexOf('_'))
  const systemMessageId = +match.substr(match.indexOf('_') + 1)
  const userId = query.from.id
  console.log(requiredId, systemMessageId)

  try {
    if (userId === requiredId) {
      await functions.unMuteUser(ctx)
      await ctx.answerCbQuery(text.welcAgain, true)
      await ctx.deleteMessage()
      await telegram.deleteMessage(ctx.chat.id, systemMessageId)
      
      await ctx.db.collection('oldUsers').updateOne(
        { userId: userId }, { $set: { allowed: true } }, { new: true, upsert: true }
      )
    } else {
      await ctx.answerCbQuery(text.notYou, true)
    }
  } catch (err) {
    functions.sendError(err, ctx)
  }
  
})

bot.hears('!publ', async (ctx) => {
  try {
    const user = await telegram.getChatMember(data.chats[0], ctx.from.id)
    if (!['creator', 'administrator'].includes(user.status)) {
      return true
    }

    ctx.scene.enter('getMessage')
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears(/правила/i, async (ctx) => {
  try {
    ctx.reply(
      text.rules, 
      Extra.markup(Markup.inlineKeyboard(
        [Markup.urlButton('📖 Правила', 'https://teletype.in/@ramziddin/BkF3SRwoB')]
      ))
      .inReplyTo(ctx.message.message_id)
    )
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears('!dev', async (ctx) => {
  try {
    await ctx.reply(text.dev, Extra.inReplyTo(ctx.message.message_id))
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears('!help', async (ctx) => {
  try {
    await ctx.reply(text.help, Extra.inReplyTo(ctx.message.message_id).HTML())
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears('!src', async (ctx) => {
  try {
    await ctx.reply(
      text.src,
      Extra.markup(Markup.inlineKeyboard(
        [Markup.urlButton('⌨️ GitHub', 'https://github.com/khuzha/chatadmin')]
      ))
      .inReplyTo(ctx.message.message_id).HTML()
    )
  } catch (err) {
    functions.sendError(err, ctx)
  }
})

bot.hears('!chatid', (ctx) => ctx.reply(ctx.chat.id))

bot.on('message', async (ctx) => {
  try {
    if (ctx.chat.type === 'private') {
      await ctx.reply('Привет! Я работаю только в чате @progersuz и его ветвях.')
    }
  } catch (err) {
    functions.sendError(err, ctx)
  }
})