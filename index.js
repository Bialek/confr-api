const fastify = require('fastify')({ logger: true })
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const authenticate = {realm: 'Westeros'}
const adapter = new FileSync('db.json')
const db = low(adapter)

const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3333, '0.0.0.0')
    fastify.swagger()
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

fastify.decorate('db', db)
fastify.register(require('fastify-cors'))
fastify.register(require('fastify-swagger'), {
  swagger: {
    info: {
      title: 'Confr API',
      version: '0.1.0',
    },
    host: 'confr-api.herokuapp.com',
    schemes: ['https'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
  exposeRoute: true,
  routePrefix: '/',
})
fastify.register(require('fastify-jwt'), {
  secret: 'supersecret'
})
fastify.register(require('fastify-basic-auth'), { validate, authenticate })
function validate (username, password, req, reply, done) {
  if (username === 'Rick' && password === 'Sanches') {
    done()
  } else {
    done(new Error('Winter is coming'))
  }
}

fastify.register(require('./routes/rooms'))

fastify.after(() => {
  const token = fastify.jwt.sign({})
  fastify.route({
    method: 'GET',
    url: '/login',
    preHandler: fastify.basicAuth,
    handler: async (req, reply) => {
      return { token: token }
    }
  })
})

fastify.ready(err => console.log(err))
start()
