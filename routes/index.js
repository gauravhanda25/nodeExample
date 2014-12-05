var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
mongoose.connect('mongodb://localhost/shareChat', function (err) {
    if (err) {
        console.log(err);
    }
});


exports.index = function (io) {
	return function ( req, res, next ){
	  var user_id = req.cookies ?
    req.cookies.user_id : undefined;
    
	
	var nicknames = {},
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

};

exports.create = function ( req, res, next ){
  new Todo({
      user_id    : req.cookies.user_id,
      content    : req.body.content,
      updated_at : Date.now()
  }).save( function ( err, todo, count ){
    if( err ) return next( err );

    res.redirect( '/' );
  });
}}

exports.destroy = function ( req, res, next ){
  Todo.findById( req.params.id, function ( err, todo ){
    var user_id = req.cookies ?
      req.cookies.user_id : undefined;

    if( todo.user_id !== user_id ){
      return utils.forbidden( res );
    }

    todo.remove( function ( err, todo ){
      if( err ) return next( err );

      res.redirect( '/' );
    });
  });
};

exports.edit = function( req, res, next ){
  var user_id = req.cookies ?
      req.cookies.user_id : undefined;

  Todo.
    find({ user_id : user_id }).
    sort( '-updated_at' ).
    exec( function ( err, todos ){
      if( err ) return next( err );

      res.render( 'edit', {
        title   : 'Express Todo Example',
        todos   : todos,
        current : req.params.id
      });
    });
};

exports.update = function( req, res, next ){
  Todo.findById( req.params.id, function ( err, todo ){
    var user_id = req.cookies ?
      req.cookies.user_id : undefined;

    if( todo.user_id !== user_id ){
      return utils.forbidden( res );
    }

    todo.content    = req.body.content;
    todo.updated_at = Date.now();
    todo.save( function ( err, todo, count ){
      if( err ) return next( err );

      res.redirect( '/' );
    });
  });
};

// ** express turns the cookie key to lowercase **
exports.current_user = function ( req, res, next ){
  var user_id = req.cookies ?
      req.cookies.user_id : undefined;

  if( !user_id ){
    res.cookie( 'user_id', utils.uid( 32 ));
  }

  next();
};
