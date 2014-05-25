var Multiplayer = {
	
	/*
	WebSocket-ADarkRoom-protocol:
	Packet:
	%USERNAME%!%OPCODE%!%DATA%
	
	OpCodes(client):
	CONNECT - hand shake command; prepare server to send/recieve particular player data;
	SAVE_STATE - send player data to server to be saved;
	LOAD_STATE - request player data from server to be loaded;
	
	OpCodes(server):
	STATE - player state of current player;
	*/
	
	webSocketHost: "ws://localhost:48086/adarkroom_server",
	serverHost: "http://adarkroom.bl.ee/",
	recievedData: undefined,
	webSocketClient: undefined,
	
	USERNAME: getUrlVars()['username'],
	playerInitialized: false,
	trial: 0,
	loaded: false,
	handsShaked: false,
	
	webSocketHandShake : function()
	{
		Multiplayer.webSocketClient = new WebSocket(Multiplayer.webSocketHost);
		Multiplayer.webSocketClient.onopen = function()
		{
			//console.log("WS connected");
			//Multiplayer.webSocketClient.send('Test');
			Multiplayer.webSocketInitPlayer();
		}
		Multiplayer.webSocketClient.onmessage = function(event)
		{	
			var data = event.data.split('!');
			switch(data[0])
			{
				case "OK":
					Multiplayer.handsShaked = true;
					break;
				case "STATE":
					if (data[1] !== "")
						localStorage.gameState = data[1];
			}
			console.log("Recieved: " + data[0]);
			if(Multiplayer.handsShaked && !Multiplayer.loaded)
			{
				Multiplayer.loaded = true;
				Multiplayer.webSocketLoadState();
			}
		}
		Multiplayer.webSocketClient.onclose = function(event)
		{
			console.log("WS closed");
			console.log("Code: "+event.code+" Reason: "+event.reason);
			if (Multiplayer.trial<3)
			{
				Multiplayer.trial++;
				console.log("Try again: "+Multiplayer.trial);
				Multiplayer.webSocketHandShake();
			}
		}
	},
	
	webSocketInitPlayer : function()
	{
		Multiplayer.send("CONNECT!");
	},
	
	webSocketSendState : function(state)
	{
		if(Multiplayer.handsShaked && Multiplayer.loaded)
			Multiplayer.send("SAVE_STATE!"+state);
	},
	
	webSocketLoadState : function()
	{
		Multiplayer.send("LOAD_STATE!");
	},
	
	send : function(data)
	{
		console.log("To be sent: "+Multiplayer.USERNAME+"!"+data);
		Multiplayer.webSocketClient.send(Multiplayer.USERNAME+"!"+data);
	}
	
	
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
