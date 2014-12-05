/**
 * Module dependencies.
 */

var express = require("express")
  , app = express()
  , http = require("http").createServer(app)
  , engine = require( 'ejs-locals' )
  , path = require( 'path' )
  , bodyParser = require("body-parser")
  , static = require( 'serve-static' )
  , cookie = require('cookie')
  , cookieParser = require('cookie-parser')
  , session = require('express-session')
  , io = require("socket.io").listen(http)
  , mongoose = require('mongoose');
sessionStore = new session.MemoryStore();


var nicknames = {},
    clients = {},
	users = {};

mongoose.connect('mongodb://localhost/shareChat', function (err) {
    if (err) {
        console.log(err);
    }
});
var groupSchema = new mongoose.Schema({
    name : String
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
var group = mongoose.model('Room_Categorie', groupSchema);
var privateChat = mongoose.model('PrivateMessage', privateChatSchema);
// all environments

app.engine( 'ejs', engine );
app.set( 'port', 8155);
app.set( 'views', path.join( __dirname, 'views' ));
app.set( 'view engine', 'ejs' );
app.use( bodyParser.json());
app.use( bodyParser.urlencoded({ extended : true }));


var COOKIE_SECRET = 'secret';
var COOKIE_NAME = 'sid';


app.use(cookieParser(COOKIE_SECRET));
app.use(session({
    name: COOKIE_NAME,
    store: sessionStore,
    secret: COOKIE_SECRET,
    saveUninitialized: true,
    resave: true,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: null
    }
}));


// Routes

app.get("/", function(request, response) {
	console.log('as');
  //Render the view called "index"
  response.render("index");

});


app.use( static( path.join( __dirname, 'public' )));

// development only
if( 'development' == app.get( 'env' )){
  console.log('asd');
}
var connectedUsers = [];

io.set('authorization', function (handshake, next) {	
	 try {
        var data = handshake;
        if (! data.headers.cookie) {
            return next(new Error('Missing cookie headers'));
        }
       // console.log('cookie header ( %s )', JSON.stringify(data.headers.cookie));
        var cookies = cookie.parse(data.headers.cookie);
        console.log('cookies parsed ( %s )', JSON.stringify(cookies));
        if (! cookies[COOKIE_NAME]) {
            return next(new Error('Missing cookie ' + COOKIE_NAME));
        }
        var sid = cookieParser.signedCookie(cookies[COOKIE_NAME], COOKIE_SECRET);
        if (! sid) {
            return next(new Error('Cookie signature is not valid'));
        }
        console.log('session ID ( %s )', sid);
        data.sid = sid;
        sessionStore.get(sid, function(err, session) {
            if (err) return next(err);
            if (! session) return next(new Error('session not found'));
            data.session = session;
            next();
        });
    } catch (err) {
        console.error(err.stack);
        next(new Error('Internal server error'));
    }
});
io.sockets.on('connection', function (socket) {
	
	group.find({}, function(err, gp){
		if (err) throw err;
		socket.emit('groups', gp);
			
	})

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

http.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});
