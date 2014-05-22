var Multiplayer = {
	serverHost: "http://adarkroom.bl.ee/",
	recievedData: undefined,

	sendPlayerData : function(username, data)
	{
		$.post(this.serverHost+"save.php",{username:username,data:data},function(e){$(Multiplayer).trigger('savedPlayerData')});
	},

	recievePlayerData : function(username)
	{
		$.post(this.serverHost+"load.php",{username:username},this.onRecieveSuccess);
		//console.log(window.recievedData);
		//return window.recievedData;
	},

	onRecieveSuccess : function(data)
	{
		//console.log(data)
		Multiplayer.recievedData = data;
		//console.log(typeof(this.dispatchEvent));
		console.log()
		$(Multiplayer).trigger('loadedPlayerData');
	}
}
