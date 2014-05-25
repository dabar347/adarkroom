using System;
using System.IO;
using System.Collections.Generic;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace adarkroomserver
{
	class MainClass
	{
		static WebSocketServer wss = new WebSocketServer (48086);

		public static void Main (string[] args)
		{
			Console.WriteLine ("Server starting");
			wss.AddWebSocketService<AdarkroomService> ("/adarkroom_server");
			wss.Start ();
			Console.WriteLine ("Server started");
			Console.ReadKey (true);
			Console.WriteLine(wss.WebSocketServices.ToString());
			wss.Stop ();
		}
	}

	class AdarkroomService : WebSocketService
	{
		List<Player> playerList = new List<Player>();

		protected override void OnMessage (MessageEventArgs e)
		{
			Console.WriteLine ("Recieved " + e.Data);
			string[] data = new string[3];
			data = e.Data.Split ('!');
			if (data [0].Length > 0 && data [1].Length > 0) {
				switch (data [1]) 
				{
				case "CONNECT":
					NewPlayer (data [0]);
					OK ();
					break;
				case "SAVE_STATE":
					playerList.Find (x => x.username == data [0]).playerData = data [2];
					OK ();
					break;
				case "LOAD_STATE":
					Send ("STATE!" + playerList.Find (x => x.username == data [0]).playerData);
					break;
				default:
					Send ("Wrong OpCode");
					break;
				}
			} else {
				Send ("Wrong packet");
			}
		}

		public void SavePlayers()
		{
			foreach (Player v in playerList) {
				v.SavePlayer ();
			}
		}

		void NewPlayer(string username)
		{
			bool flag = false;
			foreach (Player v in playerList) {
				if (v.username == username)
					flag = true;
			}
			if (!flag)
				this.playerList.Add (new Player (username));
		}

		void OK()
		{
			Send ("OK!");
		}
	}

	class Player
	{
		string baseDir = AppDomain.CurrentDomain.BaseDirectory+"data/";
		public string username = "";
		public string playerData = "";
		public int playerNumber = 0;

		public Player(string username)
		{
			this.username = username;
			//Console.WriteLine (baseDir);
			this.playerNumber = ReturnPlayerNumber ();
			if (!System.IO.Directory.Exists (baseDir + "/players/" + username + "/"))
				System.IO.Directory.CreateDirectory (baseDir + "/players/" + username + "/");
			this.playerData = ReturnPlayerData ();
			Console.WriteLine ("Player loaded: " + this.playerNumber);
		}


		private string ReturnPlayerData()
		{
			if (System.IO.File.Exists (baseDir + username + "/players/" + "/playerData")) {
				return System.IO.File.ReadAllText (baseDir + "/players/" + username + "/playerData");
			} else {
				return "";
			}
		}

		private int ReturnPlayerNumber()
		{
			string[] allPlayers = System.IO.File.ReadAllLines (baseDir + "playerList");
			int n = 0;
			foreach(string v in allPlayers)
			{
				n++;
				if (v == username)
					return n;
			}
			using (System.IO.StreamWriter file = new StreamWriter (baseDir + "playerList",true)) 
			{
				file.WriteLine (username);
			}
			return n+1;
		}

		public void SavePlayer()
		{
			//Save player data
			System.IO.File.WriteAllText (baseDir + username + "/players/" + "/playerData",this.playerData);
		}
	}
}
