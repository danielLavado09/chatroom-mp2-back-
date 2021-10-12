/* 
    Está clase es la más importante del Backend, pues aquí se despliega el servidor haciendo uso de
    Express, el cual para cuestiones de desarrollo correra en el localhost:3000.
    Para cuestiones de comunicación entre BACKEND y FRONTED se hace uso de la libreria cors.
*/

const express = require('express');
const app = express();
const cors = require('cors')
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
var corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200 // está opción es para Browser Legacy.
}
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(authRoutes);


const http = require('http').createServer(app);
const mongoose = require('mongoose');
const socketio = require('socket.io');
const { callbackify } = require('util');
const io = socketio(http);
const mongoDB = "mongodb+srv://chatdoveadmin:dovepass29092021@cluster0.cvjsi.mongodb.net/chat-database?retryWrites=true&w=majority";
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('connected')).catch(err => console.log(err))
const {addUser, getUser, removeUser} = require('./helper');
const PORT = process.env.PORT || 5000
const Room = require('./models/Room');
const Message = require('./models/Message')

app.get('/set-cookies', (req, res) => {
    res.cookie('isAuthenticated', true, { maxAge: 24 * 60 * 60 * 1000 });
    res.send('cookies are set');
})

app.get('/get-cookies', (req, res) => {
    const cookies = req.cookies;
    console.log(cookies);
    res.json(cookies);
})

io.on('connection', (socket) => {
    console.log(socket.id);

    Room.find().then(result =>{
        console.log('output-rooms', result)
        socket.emit('output-rooms', result)
    })
    
    socket.on('create-room', name => {
        //console.log('Sala: ', name)
        const room = new Room({ name });
        room.save().then(result =>{
            io.emit('room-created', result)
        })
    })
    socket.on('join', ({ name, room_id, user_id }) => {
        const { error, user } = addUser({
            socket_id: socket.id,
            name,
            room_id,
            user_id
        })
        socket.join(room_id);
        if (error) {
            console.log('Error de ingreso', error)
        } else {
            console.log('Ingreso', user)
        }
    })
    socket.on('sendMessage', (message, room_id, callback)=>{
        const user = getUser(socket.id);
        const msgToStore = {
            name:user.name,
            user_id:user.user_id,
            room_id,
            text:message
        }
        console.log('message', msgToStore)
        const msg = new Message(msgToStore);
        msg.save().then(result=>{
            io.to(room_id).emit('message', result)
            callback()
        })
        
    })
    socket.on('get-messages-history', room_id => {
        Message.find({ room_id }).then(result => {
            socket.emit('output-messages', result)
        })
    })
    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id);
    })
});

http.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});