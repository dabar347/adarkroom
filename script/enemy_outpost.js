var EnemyOutpost = {
	enemyLevel: 0,
	levelProbability: [],
	probabilityS: 1,
	probabilityD: 0,
	probabilityM: 0,
	scenes : ['win','m','d','s'],
	probabilities: [0,0,0,0],
	nextScene: 'wait',
	/*
	Up to ten levels of defenders
	enemyLevel = population / 8;
	
	Level-N
		Probability
		if (N <= enemyLevel)
			100%
		else
			50%-5%*(N-enemyLevel)
	
	Examples
		enemyLevel = 5
		Probabilities
			1: 100
			2: 100
			3: 100
			4: 100
			5: 100
			6: 50-20(6-1) = 50 - 20 = 30
			7: 10 
			8: 0
			9: 0
			10: 0
	
	
	Enemies
	Three levels: man(M), soldier(D), sniper(S)
	
	Probabilities:
	S=7%*enemyLevel;
	D=(100%-S)/100*7*enemyLevel;
	M=100%-(S+D);
	
				notification: 'the shot echoes in the empty street.',
				combat: true,
  				enemy: 'sniper',
  				chara: 'S',
  				damage: 15,
  				hit: 0.8,
  				attackDelay: 4,
  				health: 30,
				ranged: true,
  				loot: {
  					'cured meat': {
  						min: 1,
  						max: 5,
  						chance: 0.8
  					},
					'bullets': {
						min: 1,
						max: 5,
						chance: 0.5
					},
					'rifle': {
						min: 1,
						max: 1,
						chance: 0.2
					}
  				},
		        buttons: {
		        	'continue': {	
						text: 'continue',
						nextScene: {0.5: 'c4', 1: 'c5'}
					},
					'leave': {
						text: 'leave city',
						nextScene: 'end'
					}
		        }
	
				notification: 'the soldier steps out from between the buildings, rifle raised.',
				combat: true,
  				enemy: 'soldier',
				ranged: true,
  				chara: 'D',
  				damage: 8,
  				hit: 0.8,
  				attackDelay: 2,
  				health: 50,
  				loot: {
  					'cured meat': {
  						min: 1,
  						max: 5,
  						chance: 0.8
  					},
					'bullets': {
						min: 1,
						max: 5,
						chance: 0.5
					},
					'rifle': {
						min: 1,
						max: 1,
						chance: 0.2
					}
  				},
		        buttons: {
		        	'continue': {	
						text: 'continue',
						nextScene: {0.5: 'c5', 1: 'c6'}
					},
					'leave': {
						text: 'leave city',
						nextScene: 'end'
					}
		        }
	
				notification: 'a frail man stands defiantly, blocking the path.',
				combat: true,
  				enemy: 'frail man',
  				chara: 'M',
  				damage: 1,
  				hit: 0.8,
  				attackDelay: 2,
  				health: 10,
  				loot: {
  					'cured meat': {
  						min: 1,
  						max: 5,
  						chance: 0.8
  					},
  					'cloth': {
  						min: 1,
  						max: 5,
  						chance: 0.5
  					},
  					'leather': {
  						min: 1,
  						max: 1,
  						chance: 0.2
  					},
  					'medicine': {
  					  min: 1,
  					  max: 3,
  					  chance: 0.05
  					}
  				},
		        buttons: {
		        	'continue': {	
						text: 'continue',
						nextScene: {0.5: 'c7', 1: 'c8'}
					},
					'leave': {
						text: 'leave city',
						nextScene: 'end'
					}
		        }
	
	Init steps:
	1) Outpost is entered
	2) Load player level (where player number is World.state.map[World.curPos[0]][World.curPos[1]] as Int)
	3) Allow to continue
	*/
	stage: 1,
	applyState : function(state_string)
	{
		state = JSON.parse(state_string);
		EnemyOutpost.enemyLevel = (state.game.population / 8 | 0);
		for (var i = 1; i<=10; i++)
		{
			if (EnemyOutpost.enemyLevel >= i)
			{
				EnemyOutpost.levelProbability[i] = 1;
			}
			else
			{
				if (0.5-0.05*(i-EnemyOutpost.enemyLevel) > 0)
				{
					EnemyOutpost.levelProbability[i] = 0.5-0.05*(i-EnemyOutpost.enemyLevel);
				}
				else
				{
					EnemyOutpost.levelProbability[i] = 0;
				}
			}
		}
		EnemyOutpost.probabilityS = 0.07*EnemyOutpost.enemyLevel;
		EnemyOutpost.probabilityD = (1-EnemyOutpost.probabilityS)*0.07*EnemyOutpost.enemyLevel;
		EnemyOutpost.probabilityM = 1 - EnemyOutpost.probabilityS - EnemyOutpost.probabilityD;
		EnemyOutpost.refresh();
	},
	
	init : function()
	{
		Multiplayer.webSocketLoadCustomState(World.state.map[World.curPos[0]][World.curPos[1]]);
	},
	
	refresh : function()
	{
		if (EnemyOutpost.enemyLevel == 0)
		{
			EnemyOutpost.nextScene = 'wait';
		}
		else if (EnemyOutpost.stage == 11)
		{
			EnemyOutpost.nextScene = 'win';
		}
		else
		{
			var scenes = ['win','m','d','s'];
			var probabilities = [0,0,0,0];
			probabilities[0] = 1 - EnemyOutpost.levelProbability[EnemyOutpost.stage];
			probabilities[1] = EnemyOutpost.levelProbability[EnemyOutpost.stage]*EnemyOutpost.probabilityM;
			probabilities[2] = EnemyOutpost.levelProbability[EnemyOutpost.stage]*EnemyOutpost.probabilityD;
			probabilities[3] = EnemyOutpost.levelProbability[EnemyOutpost.stage]*EnemyOutpost.probabilityS;
			var rnd = Math.random();
			var acc = 0;
			var acc1 = 0;
			for (var i = 0; i<=3; i++)
			{
				acc1 += probabilities[i];
				if (rnd >= acc && rnd < acc1)
				{
					EnemyOutpost.nextScene = scenes[i];
				}
				acc = acc1;
			}
		}
	}
}
