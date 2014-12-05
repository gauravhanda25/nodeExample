	//
// socket.io code
//
var socket = io.connect();
var personalId = '';
var rooms;

socket.on('connect', function (data) {
    rooms = data;
    for(var k in rooms) {
        alert(k+' // '+rooms[k]);
    }
    personalId = socket.io.engine.id;
    $('#chat')
        .addClass('connected');
});

socket.on('announcement', function (msg) {
    $('#lines')
        .append($('<p>')
            .append($('<em>')
                .text(msg)));
});

socket.on('nicknames', function (nicknames) {
    $('#nicknames')
        .empty()
        .append($('<span>Online: </span>'));
    for (var i in nicknames) {
        if (nicknames[i].name) {
            $('#nicknames')
                .append($('<b class="online_clients" id="' + nicknames[i].socket + '">')
                    .text(nicknames[i].name));
        }
    }
});

socket.on('user message', message);
socket.on('user image', image);
socket.on('reconnect', function () {
    $('#lines')
        .remove();
    message('System', 'Reconnected to the server');
});

socket.on('privateMessage', function (msg, from, objId) {
    var chatWindow = '<div class="privateChat" id="chatbox_' + objId + '" data-uri="' + objId + '"><span class="title">' + from + '</span><div class="privateLines"></div><input class="privateChatTextBox" type="text"/></div>';
    var idCnt = 0;
    $("#chatbox_" + objId)
        .each(function () {
            idCnt++;
        });

    if (idCnt == 1) {
    } else {
        $('#chat')
            .after(chatWindow);
        var cnt = $('.privateChat')
            .length;
        if ($("#chatbox_" + objId)
        .length == 1) {
        if (cnt == 1) {
            $("#chatbox_" + objId)
                .css({
                    'right': '15px',
                    'display': 'block'
                });
        } else {
            width = (cnt - 1) * (200 + 7) + 15;
            $("#chatbox_" + objId)
                .css({
                    'right': width + 'px',
                    'display': 'block'
                });
            }
        }
    }



    

    $('div#chatbox_'+objId)
        .find('.privateLines')
            .append($('<p class="you">')
                .append($('<b>')
                    .text(from), msg));
    });

socket.on('reconnecting', function () {
    message('System', 'Attempting to re-connect to the server');
});

socket.on('groupHistory', function (docs) {
    for(var i=0; i<= docs.length-1; i++){
        message(docs[i].nick, '', docs[i].msg);
    }
});
socket.on('groups', function (docs) {
    for(var i=0; i<= docs.length-1; i++){
        $('#groups').append($('<p>'))
						.append($('<b>').text(docs.name));
    }
});

socket.on('error', function (e) {
    message('System', e ? e : 'A unknown error occurred');
});

function message(from, id, msg) {
    $('#lines')
        .append($('<p>')
            .append($('<b>')
                .text(from), msg));
}

/*function image (from, base64Image) {
  $('#lines').append($('<p>').append($('<b>').text(from), '<img src="' + base64Image + '"/>'));
}*/

function image(from, base64Image) {
        $('#lines')
            .append($('<p>')
                .append($('<b>')
                    .text(from), '<a href="' + base64Image + '" download ><img src="' + base64Image + '"/></a>'));
    }
    //
    // dom manipulation code
    //
$(function () {
    $('#set-nickname')
        .submit(function (ev) {
            socket.emit('nickname', $('#nick')
                .val(),
                function (set) {
                    if (!set) {
                        clear();
                        $('#lines').css('visibility', 'visible');
                        return $('#chat')
                            .addClass('nickname-set');
                    }
                    $('#nickname-err')
                        .css('visibility', 'visible');
                });
            return false;
        });

    $('#send-message')
        .submit(function () {
            message('me', personalId, $('#message')
                .val());
            socket.emit('user message', $('#message')
                .val());
            clear();
            $('#lines')
                .get(0)
                .scrollTop = 10000000;
            return false;
        });

    function clear() {
        $('#message')
            .val('')
            .focus();
    };

    $('body')
        .on('click', '.online_clients', function () {
            var objId = $(this)
                .attr('id');
            if(objId == personalId)
                return false;
        
            var objText = $(this)
                .text();

            var chatWindow = '<div class="privateChat" id="chatbox_' + objId + '" data-uri="' + objId + '"><span class="title">' + objText + '</span><div class="privateLines"></div><input class="privateChatTextBox" type="text"/></div>';
            var idCnt = 0;
            $("#chatbox_" + objId)
                .each(function () {
                    idCnt++;
                });

            if (idCnt == 1)
                return false;

            $('#chat')
                .after(chatWindow);
            var cnt = $('.privateChat')
                .length;



            if ($("#chatbox_" + objId)
                .length == 1) {
                if (cnt == 1) {
                    $("#chatbox_" + objId)
                        .css({
                            'right': '15px',
                            'display': 'block'
                        });
                } else {
                    width = (cnt - 1) * (200 + 7) + 15;
                    $("#chatbox_" + objId)
                        .css({
                            'right': width + 'px',
                            'display': 'block'
                        });
                }
            }
         $( this ).find('.privateChatTextBox').focus();
        });
    $('#imagefile')
        .bind('change', function (e) {
            var data = e.originalEvent.target.files[0];
            var reader = new FileReader();
            reader.onload = function (evt) {
                image('me', evt.target.result);
                socket.emit('user image', evt.target.result);
            };
            reader.readAsDataURL(data);

        });
    $('body').on('keypress', '.privateChatTextBox', function(e){
        if( e.keyCode == 13 ) {
            var msg = $.trim($(this).val());
            $(this).val('');
            if( msg != '') {
                $(this).siblings('div.privateLines').append($('<p class="me">')
                                                            .append($('<b>')
                                                                    .text('me'), msg));
                socket.emit('privateMessage', msg, $(this).parent().attr('data-uri'));
            }
        }
    })
});
