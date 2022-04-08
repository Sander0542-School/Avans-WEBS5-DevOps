const Target = require('../models/target')

function initialize (rabbitMqConnection) {
  rabbitMqConnection.createChannel()
    .then(channel => {
      channel.assertQueue('webs.target.tags', {
        durable: true
      })
        .then(queue => {
          channel.consume(queue.queue, message => {
            const content = JSON.parse(message.content.toString())

            Target.findByIdAndUpdate(content.targetId, { tags: content.tags }, { returnDocument: 'after' })
              .then(target => {
                console.log(`Updated target ${target.id} with ${content.tags.count} tags`)
                channel.ack(message)

                channel.assertQueue('webs.cqrs.target')
                  .then(queue => {
                    channel.sendToQueue(queue.queue, Buffer.from(JSON.stringify({
                      action: 'create',
                      data: target
                    })))
                  })
              })
              .catch(error => {
                console.error(error)
              })
          })
        })
    })
    .catch(error => {
      console.error(error)
    })
}

module.exports = initialize
