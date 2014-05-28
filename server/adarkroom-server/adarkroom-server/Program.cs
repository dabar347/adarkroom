using System;
using System.IO;
using System.Collections.Generic;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace adarkroomserver
{
	class MapCollection
	{
		string baseDir = AppDomain.CurrentDomain.BaseDirectory+"data/";
		private string[,] maps = new string[4,4];

		public MapCollection()
		{
			for (byte i = 0; i < 4; i++) {
				for (byte j = 0; j < 4; j++) {
					maps [i, j] = "undefined";
				}
			}
			LoadAllMaps ();
		}

		public void LoadAllMaps()
		{
			for (byte i = 0; i < 4; i++) {
				for (byte j = 0; j < 4; j++) {
					if (System.IO.File.Exists(baseDir + "/maps/"+i+"."+j+".map"))
					{
						maps[i,j] = (System.IO.File.ReadAllLines (baseDir + "/maps/" + i + "." + j + ".map"))[0];
					}
					else
					{
						maps [i, j] = "undefined";
					}
				}
			}
		}





		private void SaveMap (byte x, byte y)
		{
			System.IO.File.WriteAllText (baseDir+"/maps/"+x+"."+y+".map",maps[x,y]);
		}

		public string this[byte x,byte y]
		{
			get
			{
				return maps[x,y];
			}

			set 
			{
				maps [x,y] = value;
				SaveMap (x, y);
			}
		}
	}

	class MaskCollection
	{
		string baseDir = AppDomain.CurrentDomain.BaseDirectory+"data/players/";
		private string[,] masks = new string[4,4];

		public MaskCollection (string player)
		{
			baseDir += player + "/masks/";
			for (byte i = 0; i < 4; i++) {
				for (byte j = 0; j < 4; j++) {
					masks [i, j] = "undefined";
				}
			}
			if (!System.IO.Directory.Exists (baseDir))
				System.IO.Directory.CreateDirectory (baseDir);
			LoadAllMasks ();
		}

		public string this[byte x,byte y]
		{
			get
			{
				return masks[x,y];
			}

			set 
			{
				masks [x,y] = value;
				SaveMask (x, y);
			}
		}

		public void LoadAllMasks()
		{
			for (byte i = 0; i < 4; i++) {
				for (byte j = 0; j < 4; j++) {
					if (System.IO.File.Exists(baseDir+i+"."+j+".mask"))
					{
						masks[i,j] = (System.IO.File.ReadAllLines (baseDir+i+"."+j+".mask"))[0];
					}
					else
					{
						masks [i, j] = "undefined";
					}
				}
			}
		}

		private void SaveMask(byte x, byte y)
		{
			System.IO.File.WriteAllText (baseDir+x+"."+y+".mask",masks[x,y]);
		}
	}

	class MainClass
	{
		//MapCollection maps = new MapCollection();
		static WebSocketServer wss = new WebSocketServer (48086);

		public static void Main (string[] args)
		{
			Console.WriteLine ("Server starting");
			//AdarkroomService service = new AdarkroomService (emitter);
			wss.AddWebSocketService<AdarkroomService> ("/adarkroom_server");
			wss.Start ();
			Console.WriteLine ("Server started");
			Console.ReadKey (true);
			wss.Stop ();
		}
	}

	class AdarkroomService : WebSocketService
	{
		List<Player> playerList = new List<Player>();
		MapCollection maps = new MapCollection();

		protected override void OnMessage (MessageEventArgs e)
		{
			Console.WriteLine ("Recieved from: " + e.Data.Split('!')[0] + '!' + e.Data.Split('!')[1]);
			string[] data = new string[3];
			data = e.Data.Split ('!');
			byte n, y;
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
				case "SAVE_MAP":
					//byte x = n - y * 4;
					n = (byte)(playerList.Find (x => x.username == data [0]).playerNumber);
					y = (byte)(n / 4);
					maps [(byte)(n - y * 4 - 1), (byte)(n / 4)] = data [2];
					OK ();
					break;
				case "LOAD_CUSTOM_MAP":
					n = (byte)(playerList.Find (x => x.username == data [0]).playerNumber);
					y = (byte)(n / 4);
					string[] coordinates = data [2].Split ('&');
					int _x = Convert.ToInt32 (coordinates [0]);
					int _y = Convert.ToInt32 (coordinates [1]);
					string request = "";
					if ((n - y * 4 - 1 + _x) < 0 || (n - y * 4 - 1 + _x) > 3 || (y + _y) < 0 || (y + _y) > 3) {
						request = "undefined";
					} else {
						request = maps [(byte)(n - y * 4 - 1 + _x), (byte)(y + _y)];
					}
					Send("MAP!"+request);
					break;
				case "SAVE_MASK":
					//byte x = n - y * 4;
					string[] splited = data [2].Split ('&');
					byte[] coord = new byte[2];
					coord [0] = Convert.ToByte (splited [0]);
					coord [1] = Convert.ToByte (splited [1]);
					playerList.Find (x => x.username == data [0]).masks [coord [0], coord [1]] = splited [2];
					break;
				case "LOAD_ALL_MASKS":
					for (byte i = 0; i < 4; i++) {
						for (byte j = 0; j < 4; j++) {
							Send ("MASK!" + i + "&" + j + "&" + playerList.Find (x => x.username == data [0]).masks [i, j]);
						}
					}
					break;
				default:
					Send ("Wrong OpCode");
					break;
				}
			} else {
				Send ("Wrong packet");
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
		private string _playerData = "";
		public int playerNumber = 0;
		public MaskCollection masks;

		public string playerData
		{
			get
			{
				return _playerData;
			}

			set 
			{
				_playerData = value;
				SavePlayer ();
			}
		}

		public Player(string username)
		{
			this.username = username;
			//Console.WriteLine (baseDir);
			this.playerNumber = ReturnPlayerNumber ();
			if (!System.IO.Directory.Exists (baseDir + "/players/" + username + "/"))
				System.IO.Directory.CreateDirectory (baseDir + "/players/" + username + "/");
			this._playerData = ReturnPlayerData ();
			masks = new MaskCollection (username);
			Console.WriteLine ("Player loaded: " + this.playerNumber);
		}


		private string ReturnPlayerData()
		{
			if (System.IO.File.Exists (baseDir + "/players/" + username + "/playerData")) {
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
			System.IO.File.WriteAllText (baseDir + "/players/" + username + "/playerData",this.playerData);
		}
	}
}
