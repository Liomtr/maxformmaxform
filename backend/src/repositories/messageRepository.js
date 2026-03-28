import Message from '../models/Message.js'

const messageRepository = {
  async list(payload = {}) {
    return Message.list(payload)
  },

  async markRead(id, recipientId) {
    return Message.markRead(id, recipientId)
  }
}

export default messageRepository
