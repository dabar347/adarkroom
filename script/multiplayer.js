var Multiplayer = {
	
	/*
	TODO:
	- Interaction between players
		- Fight
		- Trade
		- ???
	- Interaction player-enemyVillage
	- Event for enemyOutposts
	- Sort out situation if two players on one map.
		- How to refresh changes
	*/
	
	
	USERNAME: getUrlVars()['username'],
	
	
	//Init stages
	/*
	0 - Web Socket connect
	1 - Web Socket handshake
	2 - Load player map
	3 - Load player state
	4 - Apply player state
	5 - Apply player map
	6 - Init and load masks
	7 - Apply player mask
	
	999 - initialization is done
	*/
	
	initStage: 0,
	initMultiplayer : function()
	{
		console.log("Init stage "+Multiplayer.initStage)
		switch(Multiplayer.initStage)
		{
		case 0:
			Multiplayer.webSocketInit(); //Connect
			break;
		case 1:
			Multiplayer.webSocketInitPlayer(); //HandShake
			break;
		case 2:
			Multiplayer.webSocketLoadMapP();//Load player map
			break;
		case 3:
			Multiplayer.webSocketLoadState();//Load player state
			break;
		case 4:
			localStorage.gameState = JSON.stringify(Multiplayer.playerState);//Apply player state
			Engine.loadGame();
			Multiplayer.initStage++;
			Multiplayer.initMultiplayer();
			break;
		case 5:
			//$SM.set('game.world.map',Multiplayer.playerMap);//Apply map
			if(Multiplayer.playerMap !== "undefined")
			{
				$SM.set('game.world.map',Multiplayer.playerMap);
			}
			else
			{
				$SM.set('game.world.map',World.generateMap());
			}
			Multiplayer.initStage++;
			Multiplayer.initMultiplayer();
			break;
		case 6:
			Multiplayer.initMasks();//Init and load masks
			break;
		case 7:
			if(Multiplayer.masks[Multiplayer.playerMapX][Multiplayer.playerMapY] !== "undefined")
			{
				$SM.set('game.world.mask',JSON.parse(Multiplayer.masks[Multiplayer.playerMapX][Multiplayer.playerMapY]));
			}
			else
			{
				$SM.set('game.world.mask',World.newMask());
			}
			//Apply mask
			Multiplayer.initStage++;
			Multiplayer.initMultiplayer();
			break;
		default:
			Multiplayer.initStage = 999;
			break;
		}
	},
	
	
	/*FLAGS*/
	playerStepFlag : [false, undefined], 
	playerEnterWorld : [false, undefined],
	
	/*
	World variables and functions
	*/
	
	//Map piece
	playerMapX: 0,
	playerMapY: 0,
	
	playerMap: "undefined", //Object
	playerMask: "undefined", //Object
	playerNumber: 0,
	xMap: 0,
	yMap: 0,
	vector: [0,0],
	masks: [], //Array of Objects
	tempMasks: [], //Array of Objects
	
	
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
		if (array[0] == Multiplayer.playerMapX && array[1] == Multiplayer.playerMapY)
		{
			Multiplayer.initStage++;
			Multiplayer.initMultiplayer();
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
			//Multiplayer.webSocketSaveCustomMap(Multiplayer.xMap,Multiplayer.yMap,World.state.map);
			
			//If player has just entered world
			if(Multiplayer.playerEnterWorld[0])
			{
				Multiplayer.playerEnterWorld[0] = false;
				$SM.set('game.world.map',JSON.parse(map));
				Path._embark();
				return 1;
			}
			
			
			if (Multiplayer.xMap == 0 && Multiplayer.yMap == 0)
			{
				Multiplayer.playerMap = World.state.map;
				Multiplayer.playerMask = World.state.mask;
			}
			restoredMap = JSON.parse(map);
			World.state.map = restoredMap;
			
			
			//If map-sector hasn't changed
			if(Multiplayer.playerStepFlag[0])
			{
				Multiplayer.playerStepFlag[0] = false;
				World._move(Multiplayer.playerStepFlag[1]);
				return 1;
			}
			
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
				Notifications.notify(World, "you're back home");
			}
			else
			{
				Notifications.notify(World, "you're on the foreign land");
			}
			//Emit positive event
		}
		else
		{
			//Emit negative event
			Notifications.notify(World, "this place hasn't been discovered yet");
		}
		
	},
	
	restoreMap: function()
	{
		if (Multiplayer.xMap != 0 || Multiplayer.yMap != 0)
		{
			if (Multiplayer.playerMap !== "undefined") World.state.map = Multiplayer.playerMap;
			if (Multiplayer.playerMask !== "undefined") World.state.mask = Multiplayer.playerMask;
			Multiplayer.xMap = 0;
			Multiplayer.yMap = 0;
		}		
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
	SAVE_CUSTOM_MAP - save custom map
	LOAD_CUSTOM_MAP - load map (that doesn't belong to current player);
		Example: %UN%!SEND_CUSTOM_MAP!%x%&%y%&%MAP_DATA%
			Where: %x% and %y% relative 
	LOAD_MAP - request current player map from server to be loaded;
	SAVE_ALL_MASK - save mask for current player;
	LOAD_ALL_MASK - load masks for current player;
	LOAD_CUSTOM_STATE - load teh state of custom player
		%UN%!LOAD_CUSTOM_STATE!%PLAYER_NUMBER%
	
	
	OpCodes(server):
	OK - command is OK;
	PLAYER - return player number; confirmation of handshake;
	STATE - player state of current player;
	MAP - requested map;
	MASK - requested mask;
	NOTIFICATION - notification to be shown
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
	
	webSocketInit : function()
	{
		//console.log($SM.get('game.world.map'));
		Multiplayer.webSocketURI = Multiplayer.webSocketProtocol + Multiplayer.webSocketHost + Multiplayer.webSocketPort + Multiplayer.webSocketTail;
		Multiplayer.webSocketClient = new WebSocket(Multiplayer.webSocketURI);
		Multiplayer.webSocketClient.onopen = function()
		{
			//console.log("WS connected");
			//Multiplayer.webSocketClient.send('Test');
			Multiplayer.initStage++; //1
			Multiplayer.initMultiplayer();
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
					Multiplayer.playerMapY = (Multiplayer.playerNumber - 1) / 4 | 0;
					Multiplayer.playerMapX = Multiplayer.playerNumber - 1 - Multiplayer.playerMapY * 4;
					Multiplayer.initStage++; //
					Multiplayer.initMultiplayer();
					break;
				case "STATE":
					//console.log(data[1]);
					Multiplayer.playerState = JSON.parse(data[1]);
					Multiplayer.initStage++;
					Multiplayer.initMultiplayer();
					//Engine.loadGame();
					//Multiplayer.loaded = true;
					break;
				case "MAP":
					if (Multiplayer.initStage == 2)
					{
						Multiplayer.playerMap = JSON.parse(data[1]);
						Multiplayer.initStage++;
						Multiplayer.initMultiplayer();
					}
					else
					{
						Multiplayer.moveMap2(data[1]);
					}
					break;
				case "MASK":
					Multiplayer.recieveMask(data[1]);
					break;
				case "NOTIFICATION":
					Notifications.notify(null, data[1]);
					break;
				case "CUSTOM_STATE":
					EnemyOutpost.applyState(data[1]);
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
				Multiplayer.initMultiplayer();
			}
		}
	},
	
	webSocketInitPlayer : function()
	{
		Multiplayer.send("CONNECT!");
	},
	
	/*WHEN:
	SinglePlayer saving (X)
	*/
	webSocketSendState : function(state,map)
	{
		if(Multiplayer.initStage >= 999)
		{
			Multiplayer.send("SAVE_STATE!"+state);
		}
	},
	
	/*WHEN:
	Enter map (X)
	Change map (X)
	Do step (X)
	*/
	webSocketLoadMap : function(x, y)
	{
		Multiplayer.send("LOAD_CUSTOM_MAP!"+x+"&"+y);
	},
	
	/*WHEN:
	Any changes (X)
	DO NOT SAVE on exit
	*/
	webSocketSaveCustomMap : function(x, y, map)
	{
		Multiplayer.send("SAVE_CUSTOM_MAP!"+x+"&"+y+"&"+JSON.stringify(map));
	},
	
	webSocketLoadState : function()
	{
		Multiplayer.send("LOAD_STATE!");
	},
	
	webSocketLoadMapP : function()
	{
		//Multiplayer.send("LOAD_CUSTOM_MAP!"+Multiplayer.playerMapX+"&"+Multiplayer.playerMapY)
		Multiplayer.send("LOAD_CUSTOM_MAP!"+0+"&"+0)
	},
	
	webSocketLoadAllMasks : function()
	{
		Multiplayer.send("LOAD_ALL_MASKS!");
	},
	
	webSocketSaveMask : function(x,y,mask)
	{
		Multiplayer.send("SAVE_MASK!"+x+"&"+y+"&"+mask);
	},
	
	webSocketLoadCustomState : function(n)
	{
		Multiplayer.send("LOAD_CUSTOM_STATE!"+n);
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
