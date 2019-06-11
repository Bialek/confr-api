
const moment = require('moment')
const format = require('../constants/index')
const convertDate = require('../helpers/convertDate')
const convertTime = require('../helpers/convertTime')
const uuidv4 = require('uuid/v4')

module.exports = (fastify, opts, next) => {
  fastify.register(require('fastify-jwt'), {
    secret: 'supersecret'
  })
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      console.log(request)
      
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  fastify.get('/rooms', async (req, res) => {
    const rooms = await fastify.db.get('rooms').value()
    const filteredInfo = rooms.map(room => ({
      id: room.id,
      name: `${room.name}`,
      roomNumber: `${room.roomNumber}`,
      seats: room.seats,
    }
    ))
    return filteredInfo
  })

  fastify.get('/rooms/:id/reservations', async (req, res) => {
    const room = await fastify.db.get('rooms').find({ id: parseInt(req.params.id) }).value()
    const reservationsByDate = room.reservations.filter(reservation => reservation.date === req.query.date)

    return ({
      id: room.id,
      name: `${room.name}`,
      reservations: reservationsByDate,
      roomNumber: `${room.roomNumber}`,
      seats: room.seats,
    })
  })

  fastify.delete('/reservations/:id', async (req, res) => {
    const findRoom = reservations => reservations.find(reservation => reservation.id === req.params.id)
    const findId = rooms => rooms.filter(room => findRoom(room.reservations))[0].id
    const rooms = await fastify.db.get("rooms").value()
    const roomId = findId(rooms)
    const updatingRoom = rooms.filter(room => room.id === roomId)[0]
    const reservationIndex = updatingRoom.reservations.findIndex(reservation => reservation.id === req.params.id)

    updatingRoom.reservations.splice(reservationIndex, 1)
    fastify.db.get("rooms").find({ id: roomId }).reservations = updatingRoom.reservations
    fastify.db.write()
    res.code(204).send()
  })


  fastify.post("/reservations", async (req, res) => {
    let isConflict = false
    const startTime = moment(`${req.body.from}`, moment.ISO_8601)
    const endTime = moment(`${req.body.to}`, moment.ISO_8601)
    const room = await fastify.db
      .get("rooms")
      .find({ id: req.body.roomIds[0] })
      .value()

    const reservations = room.reservations.filter(reservation => reservation.date === startTime.format(format.DATE_FORMAT))
    reservations.forEach(reservation => {
      const dateFrom = moment(`${reservation.date} ${reservation.startTime}`, format.FULL_DATE_FORMAT)
      const dateTo = moment(`${reservation.date} ${reservation.endTime}`, format.FULL_DATE_FORMAT)
      if (
        dateFrom.isBetween(startTime, endTime) ||
        dateTo.isBetween(startTime, endTime) ||
        (startTime.isSame(dateFrom) && endTime.isSame(dateTo)) ||
        startTime.isBetween(dateFrom, dateTo) ||
        endTime.isBetween(dateFrom, dateTo)
      ) {
        isConflict = true
        return
      }
    })
    if (!isConflict) {
      room.reservations.push({
        id: uuidv4(),
        subject: req.body.subject,
        startTime: convertTime(req.body.from),
        endTime: convertTime(req.body.to),
        date: convertDate(req.body.from),
        owner: Date.now() % 2 === 0 ? 'rick.sanchez@patronage.onmicrosoft.com' : 'morty.smith@patronage.onmicrosoft.com'
      })

      fastify.db.get("rooms").find({ id: req.params.id }).reservations = room.resservations
      fastify.db.write()
      return room.reservations
    }
    res.code(409).send()
  })


  next()
}