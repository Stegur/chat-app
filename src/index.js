const http = require('http')
const path = require('path')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const { generateMessage,
    generateLocationMassege
} = require('./utils/messages')

const app = express()
const server = http.createServer(app)
const io = socketio(server)


const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, '../public')

app.use(express.static(publicDir))



io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('join', (options, callcack) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callcack(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has join!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callcack()
    })

    socket.on('sendMessage', (message, callcack) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callcack('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callcack()
    })

    socket.on('sendLocation', (position, callcack) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMassege(user.username, `https://www.google.com/maps?q=${position.lat},${position.long}`))
        callcack()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



server.listen(port, () => {
    console.log('Server is up on the port', port);
})
