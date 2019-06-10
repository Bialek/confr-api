const moment = require('moment')
const format = require('../constants/index')
module.exports = (time) => {
    const date = moment(time)
    const dateC = date.utc().format(format.DATE_FORMAT)
    return dateC
}