var fs = require('fs'),
    path = require('path'),
    sio = require('socket.io'),
    static = require('node-static'),
    mongoose = require('mongoose');

var app = require('http')
    .createServer(handler);
app.listen(8155);
var rooms;

mongoose.connect('mongodb://localhost/shareChat', function (err) {
    if (err) {
        console.log(err);
    }
});
var groupChatSchema = new mongoose.Schema({
    nick: String,
    msg: String,
    created: {
        type: Date,
        default: Date.now
    }
});
var privateChatSchema = new mongoose.Schema({
    to_id: String,
    from_id: String,
    nick: String,
    msg: String,
    created: {
        type: Date,
        default: Date.now
    }
});
var groupChat = mongoose.model('GroupMessage', groupChatSchema);
var privateChat = mongoose.model('PrivateMessage', privateChatSchema);

var file = new static.Server(path.join(__dirname, '..', 'public'));

function handler(req, res) {
    res.on('end', function () {
        return rooms;
    });
    file.serve(req, res);
}

var io = sio.listen(app),
    nicknames = {},
    clients = {};
users = {};

io.sockets.on('connection', function (socket) {

    groupChat.find({}, function (err, docs) {
        if (err) throw err;
        socket.emit('groupHistory', docs);
    });
    clients[socket.id] = {
        'socket': socket.id,
        'name': ''
    };
    users[socket.id] = socket;

    socket.on('user message', function (msg) {
        var groupNewMsg = new groupChat({
            nick: socket.nickname,
            msg: msg
        });
        groupNewMsg.save(function (err) {
            if (err) throw err;
            socket.broadcast.emit('user message', socket.nickname, socket.id, msg);
        })

    });

    socket.on('privateMessage', function (msg, to) {
        var privateNewMsg = new privateChat({
            to_id: to,
            from_id: socket.id,
            nick: socket.nickname,
            msg: msg
        });
        privateNewMsg.save(function (err) {
            if (err) throw err;
            users[to].emit('privateMessage', msg, socket.nickname, socket.id);
        })

    });

    socket.on('user image', function (msg) {
        socket.broadcast.emit('user image', socket.nickname, msg);
    });

    socket.on('nickname', function (nick, fn) {
        if (nicknames[nick]) {
            fn(true);
        } else {
            fn(false);
            nicknames[nick] = socket.nickname = nick;
            clients[socket.id].name = nick;
            socket.broadcast.emit('announcement', nick + ' connected');
            io.sockets.emit('nicknames', clients);
        }
    });

    socket.on('disconnect', function () {

        if (!socket.nickname) {

            return;
        }

        delete clients[socket.id];
        delete nicknames[socket.nickname];
        socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
        socket.broadcast.emit('nicknames', nicknames);
    });
});
