const data = require('./data')
const Telegraf = require('telegraf')
const { telegram } = new Telegraf(data.token)
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')


let getDate = (str) => {
  const count = +str.substr(0, +str.match(/[0-9]/)[0])
  const type = str.substr(+str.match(/[0-9]/)[0]--, 1)

  const delta = count * data.time[type]
  const date = Math.round(Date.now() / 1000) + delta
  return date
}

let checkConds = async (ctx) => {
  if (!data.chats.includes(ctx.chat.id)) {
    ctx.reply('Привет! Я работаю в чате @progersuz и его ветвях.')
    return true
  }

  if (!("reply_to_message" in ctx.message)) {
    ctx.reply('Сделай реплай, кого имеешь в виду.')
    return true
  }

  const user = await telegram.getChatMember(ctx.chat.id, ctx.from.id)
  if (!['creator', 'administrator'].includes(user.status)) {
    return true
  }
  
  const targetUser = await telegram.getChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id)
  if (['creator', 'administrator'].includes(targetUser.status)) {
    ctx.reply('Я не могу изменять права админов чата.')
    return true
  }

  if (ctx.message.reply_to_message.from.id == data.botId) {
    ctx.reply('Зачем мне заглушать самого себя?')
    return true
  }
  

  return false
}

let punishUser = async (ctx, date, command) => {
  const userId = 'reply_to_message' in ctx.message ? ctx.message.reply_to_message.from.id : ctx.update.message.from.id
 
  for (let chatId of data.chats) {
    await telegram[command](chatId, userId, { until_date: date })
  }

  if ('reply_to_message' in ctx.message) {
    await telegram.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id)
    await telegram.deleteMessage(ctx.chat.id, ctx.message.message_id)

    const str = ctx.message.text
    const match = str.match(/[0-9][mhdw]/)
    let reason = `\n\nПричина: ${str.substr(match.index + match[0].length + 1)}`
    reason.length === 11 ? reason = '' : false
    const type = match[0].charAt(match[0].length - 1)
    const dur = command === 'restrictChatMember' ? `сроком на ${match[0].replace(type, data.timeNames[type])}` : ''
    const punishment = command === 'restrictChatMember' ? 'помещен в карантин' : 'забанен'
    await ctx.reply(
      `Пользователь <a href="tg://user?id=${userId}">${ctx.message.reply_to_message.from.first_name}</a> ` +
      `${punishment} во всех чатах ${dur} ` + 
      `по команде админа <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>. ${reason}`,
       Extra.HTML()
    )
  }

  
}

let unMuteUser = async (ctx) => {
  const userId = ctx.message ? ctx.message.reply_to_message.from.id : ctx.update.callback_query.from.id

  for (let chatId of data.chats) {
    await telegram.restrictChatMember(chatId, userId, {
      can_send_messages: true, can_send_media_messages: true,
      can_send_polls: true, can_send_other_messages: true,
      can_add_web_page_previews: true, can_invite_users: true
    })
  }

  if (ctx.message) {
    await telegram.deleteMessage(ctx.chat.id, ctx.message.message_id)
    await ctx.reply(
      `Пользователю <a href="tg://user?id=${userId}">${ctx.message.reply_to_message.from.first_name}</a> ` +
      `предоставлен доступ писать во всех чатах ` + 
      `по команде админа <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>.`,
       Extra.HTML()
    )
  }


  
}

module.exports = { getDate, checkConds, punishUser, unMuteUser }