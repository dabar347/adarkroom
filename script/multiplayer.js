var Multiplayer = {
	
	initMultiplayer : function()
	{
		//Init WebSocket
		Multiplayer.webSocketHandShake();
		
		//Init maps and masks (|world);
		Multiplayer.initMasks();
	},
	
	/*
	World variables and functions
	*/
	
	//Map piece
	playerMap: "undefined",
	playerNumber: 0,
	xMap: 0,
	yMap: 0,
	vector: [0,0],
	masks: [],
	tempMasks: [],
	
	initMasks: function()
	{
		for (var i = 0; i<4; i++)
		{
			Multiplayer.masks[i] = []
			for (var j = 0; j<4; j++)
			{
				Multiplayer.masks[j] = "undefined";
			}
		}
		for (var i = 0; i<4; i++)
		{
			Multiplayer.tempMasks[i] = []
			for (var j = 0; j<4; j++)
			{
				Multiplayer.tempMasks[j] = "undefined";
			}
		}
		Multiplayer.webSocketLoadAllMasks();
	}
	
	recieveMask : function(string)
	{
		var array = string.split('&');
		if (array[2] !== "undefined")
		{
			masks[array[0]][array[1]] = array[2];
		}
	},
	
	moveMap: function(vector)//vector input
	{
		//Check if there is map for the following vector
		Multiplayer.vector = vector;
		Multiplayer.webSocketLoadMap(Multiplayer.xMap+vector[0],Multiplayer.yMap+vector[1]);
		
	},
	
	moveMap2: function(map)//Loaded map
	{
		//Load map
		if(map !== "undefined")
		{
			//console.log(map);
			//Apply map
			restoredMap = JSON.parse(map);
			World.state.map = restoredMap;
			//Change map pieces vars
			Multiplayer.xMap += Multiplayer.vector[0];
			Multiplayer.yMap += Multiplayer.vector[1];
			//console.log(restoredMap);
			//Change the position of the character
			World.move([-Multiplayer.vector[0]*60,-Multiplayer.vector[1]*60]);
			if (Multiplayer.xMap == 0 && Multiplayer.yMap == 0)
			{
				Notifications.notify(World, "You're back home");
			}
			else
			{
				Notifications.notify(World, "You're on the foreign land");
			}
			//Emit positive event
		}
		else
		{
			//Emit negative event
			Notifications.notify(World, "This place hasn't been discovered yet");
		}
		
	},
	
	restoreMap: function()
	{
		if (Multiplayer.playerMap !== "undefined") World.state.map = Multiplayer.playerMap;
		xMap = 0;
		yMap = 0;
	},
	
	/*
	WebSocket-ADarkRoom-protocol:
	Packet:
	%USERNAME%!%OPCODE%!%DATA%
	
	OpCodes(client):
	CONNECT - hand shake command; prepare server to send/recieve particular player data;
	SAVE_STATE - send player data to server to be saved;
	LOAD_STATE - request player data from server to be loaded;
	SAVE_MAP - send current player map to server to be saved;
	LOAD_CUSTOM_MAP - load map (that doesn't belong to current player);
		Example: %UN%!SEND_CUSTOM_MAP!%x%&%y%&%MAP_DATA%
			Where: %x% and %y% relative 
	LOAD_MAP - request current player map from server to be loaded;
	SAVE_MASK - save mask to server
	LOAD_ALL_MASK - load masks for current player
	
	
	OpCodes(server):
	STATE - player state of current player;
	MAP - requested map;
	MASK - requested mask;
	*/
	webSocketProtocol: "ws://",
	webSocketHost: "localhost",
	webSocketPort: ":48086",
	webSocketTail: "/adarkroom_server",
	webSocketURI: "",
	recievedData: undefined,
	webSocketClient: undefined,
	
	USERNAME: getUrlVars()['username'],
	playerInitialized: false,
	trial: 0,
	loaded: false,
	handsShaked: false,
	
	webSocketHandShake : function()
	{
		//console.log($SM.get('game.world.map'));
		Multiplayer.webSocketURI = Multiplayer.webSocketProtocol + Multiplayer.webSocketHost + Multiplayer.webSocketPort + Multiplayer.webSocketTail;
		Multiplayer.webSocketClient = new WebSocket(Multiplayer.webSocketURI);
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
					//console.log(data[1]);
					localStorage.gameState = data[1];
					Engine.loadGame();
					Multiplayer.loaded = true;
					break;
				case "MAP":
					Multiplayer.moveMap2(data[1]);
					break;
				case "MASK":
					
			}
			//console.log("Recieved: " + data[0]);
			if(Multiplayer.handsShaked && !Multiplayer.loaded)
			{
				Multiplayer.webSocketLoadState();
				//Multiplayer.moveMap([0,0]);
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
	
	webSocketSendState : function(state,map)
	{
		if(Multiplayer.handsShaked && Multiplayer.loaded)
		{
			if (Multiplayer.xMap == 0 && Multiplayer.yMap == 0)	
			{
				Multiplayer.send("SAVE_MAP!"+map);
				Multiplayer.playerMap = $SM.get('game.world.map')
			}
			Multiplayer.send("SAVE_STATE!"+state);
		}
	},
	
	webSocketLoadMap : function(x, y)
	{
		Multiplayer.send("LOAD_CUSTOM_MAP!"+x+"&"+y);
	},
	
	webSocketLoadState : function()
	{
		Multiplayer.send("LOAD_STATE!");
	},
	
	webSocketLoadAllMasks : function()
	{
		Multiplayer.send("LOAD_ALL_MASKS!");
	},
	
	send : function(data)
	{
		//console.log("To be sent: "+Multiplayer.USERNAME+"!");//+data);
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
