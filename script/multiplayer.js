var Multiplayer = {
	
	USERNAME: getUrlVars()['username'],
	
	
	//Init stages
	initMultiplayer1 : function()
	{
		//Init WebSocket
		Multiplayer.webSocketHandShake();
	},
	
	initMultiplayer2 : function()
	{
		Multiplayer.handsShaked = true;
		Multiplayer.playerMapY = (Multiplayer.playerNumber - 1) / 4 | 0;
		Multiplayer.playerMapX = Multiplayer.playerNumber - 1 - Multiplayer.playerMapY * 4;
		Multiplayer.webSocketLoadState();
		Multiplayer.initMasks();
	},
	
	/*
	World variables and functions
	*/
	
	//Map piece
	playerMapX: 0,
	playerMapY: 0,
	
	playerMap: "undefined",
	playerMask: "undefined",
	playerNumber: 0,
	xMap: 0,
	yMap: 0,
	vector: [0,0],
	masks: [],
	tempMasks: [],
	
	enterWorld : function()
	{
		//prepare temporary masks
		for (var i = 0; i<4; i++)
		{
			for (var j = 0; j<4; j++)
			{
				Multiplayer.tempMasks[i][j] = Multiplayer.masks[i][j];
			}
		}
		
	},
	
	dieWorld : function()
	{
		Multiplayer.restoreMap();
	},
	
	escapeWorld : function()
	{
		for (var i = 0; i<4; i++)
		{
			for (var j = 0; j<4; j++)
			{
				 Multiplayer.masks[i][j] = Multiplayer.tempMasks[i][j];
				 if(Multiplayer.masks[i][j] !== "undefined")
				 {
					 Multiplayer.webSocketSaveMask(i,j,Multiplayer.masks[i][j]);
				 }
			}
		}
		Multiplayer.dieWorld();
		//Save all masks
	},
	
	initMasks: function()
	{
		for (var i = 0; i<4; i++)
		{
			Multiplayer.masks[i] = []
			for (var j = 0; j<4; j++)
			{
				Multiplayer.masks[i][j] = "undefined";
			}
		}
		for (var i = 0; i<4; i++)
		{
			Multiplayer.tempMasks[i] = []
			for (var j = 0; j<4; j++)
			{
				Multiplayer.tempMasks[i][j] = "undefined";
			}
		}
		Multiplayer.webSocketLoadAllMasks();
	},
	
	recieveMask : function(string)
	{
		var array = string.split('&');
		if (array[2] !== "undefined")
		{
			Multiplayer.masks[array[0]][array[1]] = array[2];
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
			//Save previous mask
			Multiplayer.tempMasks[Multiplayer.playerMapX+Multiplayer.xMap][Multiplayer.playerMapY+Multiplayer.yMap] = JSON.stringify(World.state.mask);
			//Change map pieces vars
			Multiplayer.xMap += Multiplayer.vector[0];
			Multiplayer.yMap += Multiplayer.vector[1];
			//Apply new mask
			if (Multiplayer.tempMasks[Multiplayer.playerMapX+Multiplayer.xMap][Multiplayer.playerMapY+Multiplayer.yMap] !== "undefined")
			{
				World.state.mask = JSON.parse(Multiplayer.tempMasks[Multiplayer.playerMapX+Multiplayer.xMap][Multiplayer.playerMapY+Multiplayer.yMap]);
			}
			else
			{
				World.state.mask = World.newMask();
			}
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
		if (Multiplayer.playerMask !== "undefined") World.state.mask = Multiplayer.playerMask;
		Multiplayer.xMap = 0;
		Multiplayer.yMap = 0;
	},
	
	//Outposts
	checkOutpost: function(input)
	{
		/*
		Returns:
			1 - your own outpost
			2 - forreign outpost
			3 - not an outpost
		*/
		if (input >= 0 && input <= 15)
		{
			if (input == Multiplayer.playerNumber) return 1; else return 2;
		}
		else
		{
			return 3;
		}
	},
	
	generateOutpost: function()
	{
		return Multiplayer.playerNumber;
	},
	
	/*
	WebSocket-ADarkRoom-protocol:
	Packet:
		Client:
		%USERNAME%!%OPCODE%!%DATA%
		Server:
		%OPCODE%!%DATA%
	
	Separated data:
		%DATA%=%1%&%2%&...&%n%
	
	OpCodes(client):
	CONNECT - hand shake command; prepare server to send/recieve particular player data;
	SAVE_STATE - send player data to server to be saved;
	LOAD_STATE - request player data from server to be loaded;
	SAVE_MAP - send current player map to server to be saved;
	LOAD_CUSTOM_MAP - load map (that doesn't belong to current player);
		Example: %UN%!SEND_CUSTOM_MAP!%x%&%y%&%MAP_DATA%
			Where: %x% and %y% relative 
	LOAD_MAP - request current player map from server to be loaded;
	SAVE_ALL_MASK - save mask for current player;
	LOAD_ALL_MASK - load masks for current player;
	
	
	OpCodes(server):
	OK - command is OK;
	PLAYER - return player number; confirmation of handshake;
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
					
					break;
				case "PLAYER":
					Multiplayer.playerNumber = data[1];
					Multiplayer.initMultiplayer2();
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
					Multiplayer.recieveMask(data[1]);
					break;
			}
			//console.log("Recieved: " + data[0]);
			if(Multiplayer.handsShaked && !Multiplayer.loaded)
			{
				
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
				Multiplayer.playerMap = $SM.get('game.world.map');
				Multiplayer.playerMask = $SM.get('game.world.mask');
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
	
	webSocketSaveMask : function(x,y,mask)
	{
		Multiplayer.send("SAVE_MASK!"+x+"&"+y+"&"+mask);
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
