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

		public MapCollection()
		{
		}

		private void SaveMap (byte x, byte y, string value)
		{
			System.IO.File.WriteAllText (baseDir+"/maps/"+x+"."+y+".map",value);
		}

		public string this[byte x,byte y]
		{
			get
			{
				if (System.IO.File.Exists(baseDir + "/maps/"+x+"."+y+".map"))
				{
					return (System.IO.File.ReadAllLines (baseDir + "/maps/" + x + "." + y + ".map"))[0];
				}
				else
				{
					return "undefined";
				}
			}

			set 
			{
				SaveMap (x, y, value);
			}
		}
	}

	class MaskCollection
	{
		string baseDir = AppDomain.CurrentDomain.BaseDirectory+"data/players/";

		public MaskCollection (string player)
		{
			if (!System.IO.Directory.Exists (baseDir))
				System.IO.Directory.CreateDirectory (baseDir);
		}

		public string this[byte x,byte y]
		{
			get
			{
				if (System.IO.File.Exists(baseDir+x+"."+y+".mask"))
				{
					return (System.IO.File.ReadAllLines (baseDir+x+"."+y+".mask"))[0];
				}
				else
				{
					return "undefined";
				}
			}

			set 
			{
				SaveMask (x, y, value);
			}
		}

		private void SaveMask(byte x, byte y, string value)
		{
			System.IO.File.WriteAllText (baseDir+x+"."+y+".mask",value);
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
		//List<Player> playerList = new List<Player>();
		Player player;
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
					//Send ("PLAYER!" + playerList.Find (x => x.username == data [0]).playerNumber);
					Send ("PLAYER!" + player.playerNumber);
					//Send ("NOTIFICATION!you've connected to server as player " + playerList.Find (x => x.username == data [0]).playerNumber);
					Send ("NOTIFICATION!you've connected to server as player " + player.playerNumber);
					break;
				case "SAVE_STATE":
					player.playerData = data [2];
					OK ();
					break;
				case "LOAD_STATE":
					Send ("STATE!" + player.playerData);
					break;
				case "SAVE_MAP":
					//byte x = n - y * 4;
					n = (byte)(player.playerNumber);
					y = (byte)((n-1) / 4);
					maps [(byte)(n - 1 - y * 4), (byte)y] = data [2];
					OK ();
					break;
				case "SAVE_CUSTOM_MAP":
					n = (byte)(player.playerNumber);
					y = (byte)((n - 1) / 4);
					maps [(byte)(n - 1 - y * 4 + Convert.ToInt32 (data [2].Split ('&')[0])), (byte)(y + Convert.ToInt32 (data [2].Split ('&')[1]))] = data [2].Split ('&')[2];
					OK ();
					break;
				case "LOAD_CUSTOM_MAP":
					n = (byte)(player.playerNumber);
					y = (byte)((n - 1) / 4);
					string[] coordinates = data [2].Split ('&');
					int _x = Convert.ToInt32 (coordinates [0]);
					int _y = Convert.ToInt32 (coordinates [1]);
					string request = "";
					if ((n - 1 - y * 4 + _x) < 0 || (n - 1 - y * 4 + _x) > 3 || (y + _y) < 0 || (y + _y) > 3) {
						request = "undefined";
					} else {
						request = maps [(byte)(n - 1 - y * 4 + _x), (byte)(y + _y)];
					}
					Send("MAP!"+request);
					break;
				case "LOAD_CUSTOM_STATE": //Temp player
					Player tempPlayer = new Player(Convert.ToInt32(data[2]));

					Send ("CUSTOM_STATE!"+tempPlayer.playerData);
					break;
				case "SAVE_MASK":
					//byte x = n - y * 4;
					string[] splited = data [2].Split ('&');
					byte[] coord = new byte[2];
					coord [0] = Convert.ToByte (splited [0]);
					coord [1] = Convert.ToByte (splited [1]);
					player.masks [coord [0], coord [1]] = splited [2];
					break;
				case "LOAD_ALL_MASKS":
					for (byte i = 0; i < 4; i++) {
						for (byte j = 0; j < 4; j++) {
							Send ("MASK!" + i + "&" + j + "&" + player.masks [i, j]);
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
			this.player = new Player (username);
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

		public Player (int number)
		{
			string[] allPlayers = System.IO.File.ReadAllLines (baseDir + "playerList");
			this.username = allPlayers [number-1];
			this.playerNumber = number;
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
