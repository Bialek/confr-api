const moment = require('moment')
const format = require('../constants/index')
module.exports = (time) => {
    const date = moment(time)
    const timeC = date.utc().format(format.TIME_FORMAT)
    return timeC
}