const OpenAI = require('openai');
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const openai = new OpenAI({ apiKey: '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' });
const formatMessage = require('./helpers/formatDate')
const {
  getActiveUser,
  exitRoom,
  newUser,
  getIndividualRoomUsers
} = require('./helpers/userHelper');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set public directory
app.use(express.static(path.join(__dirname, 'public')));

// this block will run when the client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room , groupname}) => {
    const user = newUser(socket.id, username, room, groupname);

    socket.join(user.room);

    // General welcome
    socket.emit('message', formatMessage("Group Shopping", 'Messages are limited to this room! '));

    // Broadcast everytime users connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage("Group Shopping", `${user.username} has joined the room`)
      );

    // Current active users and room name
    io.to(user.room).emit('roomUsers', {
      room: user.groupname,
      users: getIndividualRoomUsers(user.room)
    });
  });

  // Listen for client message
  socket.on('chatMessage', msg => {
    const user = getActiveUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));

  async function main() {

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: msg }],
      model: "gpt-3.5-turbo",
    });

    io.to(user.room).emit('message', formatMessage("Gen AI", completion.choices[0].message.content));

  }

  main();

  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = exitRoom(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage("Group Shopping", `${user.username} has left the room`)
      );

      // Current active users and room name
      io.to(user.room).emit('roomUsers', {
        room: user.groupname,
        users: getIndividualRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
