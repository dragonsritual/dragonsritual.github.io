import apiConstructor from '../api.js'

const api = apiConstructor()

// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:8974')

// Connection opened
socket.addEventListener('open', () => {
  console.log('Watching for Blueprint changes')
})

// Listen for messages
socket.addEventListener('message', (event) => {
  if (event.data === 'reload-blueprint') {
    api.blueprint()
    return
  }

  let message
  try {
    message = JSON.parse(event.data)
  } catch {
    return
  }

  if (message?.type === 'nested-invoke') {
    window.dispatchEvent(
      new CustomEvent('nested-invoke', {
        detail: {
          name: message.name,
          order: message.order,
          logs: message.logs,
          json: message.json,
          error: message.error,
          timings: message.timings,
        },
      }),
    )
  }
})
