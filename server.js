var socketIo = require('socket.io');
var config = require('./config');
var ss = require('socket.io-stream');
var pty = require('child_pty');

var IoServer = function (app) {
    var io = socketIo(app);
    var serverClient = false;
    io.on('connection',function (socket) {
        console.log('someone come ' , socket.id);

        var serverClientEmit = function(type,params){
            serverClient && serverClient.connected && serverClient.emit(type,socket.id,params);

        };

        socket.on('disconnect',function(params) {
            console.log('someone gone ' , socket.id);
        }).on('join',function (room) {
            socket.join(room,function () {
                console.log( 'join in' , room , socket.id );
            });
            if( room == config.serverClient ){
                serverClient && serverClient.disconnect();
                serverClient = socket;
                io.to(config.webClient).emit('message','a new serverClient works now')
            }
        }).on(config.webClient,function (params) {
            io.to(config.webClient).emit('data',params);
        }).on(config.serverClient,function (params) {
            io.to(config.serverClient).emit('data',params);
        }).on('resize' , function(size){
            serverClientEmit('resize',size);
        }).on('disconnect',function(){
            serverClientEmit('kill');
        });

        ss(socket).on('terminal',function(stream,options){
            console.log('proxyStream');
            options = options || {};
            options.id = socket.id;

            if(!serverClient || serverClient.disconnected ){
                socket.emit('message','serverClient not work');
                return;
            }

            var proxyStream = ss.createStream({decodeStrings: false, encoding: 'utf-8'});
            ss(serverClient).emit('terminal',proxyStream,options);
            proxyStream.pipe(stream).pipe(proxyStream);
        });
    });
    
    var i = 0;
    setInterval(function (params) {
        //io.to(config.webClient).emit('data','server ' + (i++) );
        //io.to(config.serverClient).emit('data','server ' + (i++) ); 
    },1000);
   
};

module.exports = function( app ) {
    new IoServer(app);
}
