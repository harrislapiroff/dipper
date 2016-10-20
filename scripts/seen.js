// Description:
//   Logs and retrieves when people were last seen speaking

const moment = require('moment')
const _ = require('underscore')

class LastSeen {

  constructor(robot, brainKey) {
    this.robot = robot
    this.brainKey = brainKey
  }

  updateBrainData(name, record) {
    const data = this.robot.brain.get(this.brainKey)
    const newData = _.extend(data, {[name]: record})
    return this.robot.brain.set(this.brainKey, newData)
  }

  getBrainData(name) {
    const data = this.robot.brain.get(this.brainKey)
    try {
      return data[name]
    } catch (e) {
      return null
    }
  }

  usernameToKey(username) {
    return username.toLowerCase()
  }

  recordSighting(username, room, message) {
    this.robot.logger.debug(`Saw ${username} in ${room}, saying ${message}.`)
    this.updateBrainData(this.usernameToKey(username), {
      username,
      room,
      message,
      timestamp: Date.now()
    })
  }

  retrieveSighting(username) {
    return this.getBrainData(this.usernameToKey(username))
  }

}

const robot = function(robot) {
  const seenstore = new LastSeen(robot, 'lastseen')

  robot.hear(/.*/i, (res) => {
    const {name, room } = res.message.user
    const message = res.message.text
    seenstore.recordSighting(name, room, message)
  })

  robot.hear(/seen @?([-\w.\\^|{}`\[\]]+)/i, (res) => {
    const username = res.match[1]
    const lastseen = seenstore.retrieveSighting(username)
    if (!lastseen) {
      res.send(`I haven’t ever seen ${username}.`)
    } else {
      const seenTime = moment(lastseen.timestamp)
      res.send(`${username} was last seen ${seenTime.fromNow()} in ${lastseen.room} saying, “${lastseen.message}”`)
    }
  })
}

module.exports = robot
