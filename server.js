var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);


// serve static files from the current directory
app.use(express.static(__dirname));

var EurecaServer = require('eureca.io').EurecaServer;

var eurecaServer = new EurecaServer({allow:['setId', 'spawnEnemy', 'kill', 'updateState', 'endGame']});
var clients = {};
var nPlayers = 0;
var blueFlag = "empty";
var redFlag = "empty";

eurecaServer.attach(server);

eurecaServer.onConnect(function (conn){
    nPlayers++;
    var team = nPlayers%2;
    console.log("New player! Team: %d", team);
    var remote = eurecaServer.getClient(conn.id);
    clients[conn.id] = {id:conn.id, remote: remote, team: team};
    remote.setId(conn.id, team);
});

eurecaServer.onDisconnect(function (conn){
    console.log("Client disconnected.\n");
    nPlayers--;
    if(blueFlag == conn.id){
        blueFlag = "empty";
    } else if (redFlag == conn.id) {
        redFlag = "empty";
    }

    delete clients[conn.id];
    for(var c in clients){
        var remote = clients[c].remote;
        remote.kill(conn.id);
    }
});

eurecaServer.exports.handshake = function()
{
	//var conn = this.connection;
	for (var c in clients)
	{
		var remote = clients[c].remote;
		for (var cc in clients)
		{
            var x = clients[cc].laststate ? clients[cc].laststate.x:  0;
			var y = clients[cc].laststate ? clients[cc].laststate.y:  0;
			remote.spawnEnemy(clients[cc].id, x, y, clients[cc].team);
		}
	}
}

eurecaServer.exports.dropFlag = function(playerTeam)
{
	if(playerTeam){
        redFlag = "empty";
    }else{
        blueFlag = "empty";
    }
}

eurecaServer.exports.handleKeys = function (keys) {
	var conn = this.connection;
	var updatedClient = clients[conn.id];
    var textEvent = "";
    var eventGoal = false;

    if(keys.hasGoal){
        eventGoal = true;
        if(keys.team == 1){
            textEvent = "Blue";

        }else{
            textEvent = "Red";
        }
        textEvent += " team scores!";
        keys.hasFlag = 0;
        keys.hasGoal = 0;
        blueFlag = "empty";
        redFlag = "empty";
    }

    if(keys.hasFlag){
        if(keys.team == 1){
            if(redFlag!=conn.id && redFlag != "empty"){
                keys.hasFlag = false;
            }else{
                redFlag = conn.id;
            }
        }else{
            if(blueFlag!=conn.id && blueFlag != "empty"){
                keys.hasFlag = false;
            }else{
                blueFlag = conn.id;
            }
        }
    }

	for (var c in clients)
	{
		var remote = clients[c].remote;
        if(eventGoal){
            remote.endGame(textEvent);
        }
		remote.updateState(updatedClient.id, keys);
		clients[c].laststate = keys;
	}
    eventGoal = false;
}

server.listen(8000);
