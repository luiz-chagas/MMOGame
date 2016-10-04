var myId = 0;
var myTeam;

var land;
var flagzoneTop;
var flagzoneBottom;
var shadow;
var team;
var tank;
var player;
var blueCircle;
var redCircle;
var tanksList;
var logo;
var cursors;
var ready = false;
var move = false;
var left = false;
var right = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();

	eurecaClient.ready(function (proxy) {
		eurecaServer = proxy;
	});


	//methods defined under "exports" namespace become available in the server side

	eurecaClient.exports.setId = function(id, team)
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
        myTeam = team;
		create();
		eurecaServer.handshake();
		ready = true;
	}

	eurecaClient.exports.kill = function(id)
	{
		if (tanksList[id]) {
			tanksList[id].kill();
			console.log('killing ', id, tanksList[id]);
		}
	}

	eurecaClient.exports.spawnEnemy = function(i, x, y, team)
	{
		if (i == myId) return; //this is me
        if(tanksList[i] != null) return; //avoid duplicates
		console.log('Spawn %s %s %s', i, x, y);
		var tnk = new Tank(i, game, tank, team);
        tnk.tank.x = x;
        tnk.tank.y = y;
		tanksList[i] = tnk;
	}

	eurecaClient.exports.updateState = function(id, state)
	{
        if(id == myId){
            tanksList[id].cursor = state;
            tanksList[id].flag = state.flag;
			tanksList[id].update();
            return;
        }
		if (tanksList[id])  {
            tanksList[id].flag = state.flag;
			tanksList[id].cursor = state;
			tanksList[id].tank.x = state.x;
			tanksList[id].tank.y = state.y;
			tanksList[id].tank.angle = state.angle;
			tanksList[id].update();
		}
	}
}


Tank = function (index, game, player, team) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
	}

	this.input = {
		left:false,
		right:false,
		up:false
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.player = player;
    this.team = team;

    this.hasFlag = false;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy');
    this.redCircle = game.add.sprite(x, y, 'rCircle');
    this.blueCircle = game.add.sprite(x, y, 'bCircle');

    this.redCircle.visible = false;
    this.blueCircle.visible = false;

    this.tank.x = game.rnd.integerInRange(0,3000);

    if(this.team){
        this.tank.tint = 0x0000ff;
        this.tank.y = game.rnd.integerInRange(200,1500);
    }else{
        this.tank.tint = 0xff0000;
        this.tank.y = game.rnd.integerInRange(1500,2800);
    }

    this.tank.scale.setTo(0.3,0.3);
    this.redCircle.scale.setTo(0.45,0.45);
    this.shadow.scale.setTo(0.7,0.7);

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.redCircle.anchor.set(0.5);
    this.blueCircle.anchor.set(0.5);

    this.tank.id = index;
    game.physics.arcade.enable(this.tank);
    this.tank.body.drag.set(300);
    this.tank.body.maxVelocity.set(300);
    this.tank.body.collideWorldBounds = true;

    this.tank.angle = 0;
};

Tank.prototype.update = function() {

	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up
	);

	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server
		if (this.tank.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.tank.x;
			this.input.y = this.tank.y;
			this.input.angle = this.tank.angle;
            this.input.hasFlag = this.hasFlag;

			eurecaServer.handleKeys(this.input);
		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method

    if (this.cursor.left)
    {
        this.tank.angle -= 3;
        //this.tank.body.angularVelocity -= 3;
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, this.tank.body.speed, this.tank.body.velocity);
    }
    else if (this.cursor.right)
    {
        this.tank.angle += 3;
        //this.tank.body.angularVelocity += 3;
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, this.tank.body.speed, this.tank.body.velocity);
    }

    if (this.cursor.up)
    {
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 300, this.tank.body.acceleration);
    } else{
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 0, this.tank.body.acceleration);
    }

    if(this.cursor.hasFlag){
        this.hasFlag = true;
        this.redCircle.visible = true;
    }

    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.redCircle.x = this.tank.x;
    this.redCircle.y = this.tank.y;
    this.blueCircle.x = this.tank.x;
    this.blueCircle.y = this.tank.y;


    this.shadow.rotation = this.tank.rotation;
};

Tank.prototype.kill = function() {
	this.alive = false;
	this.tank.kill();
	this.shadow.kill();
};

var game = new Phaser.Game(960, 640, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {
    //game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    //game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('enemy', 'assets/RD2.png');
    game.load.image('shadow', 'assets/shadow.png')
    //game.load.image('logo', 'assets/logo.png');
    game.load.image('earth', 'assets/dark_grass.png');
    game.load.image('flagzone', 'assets/scorched_earth.png')
    game.load.image('bCircle', 'assets/blueCircle.png');
    game.load.image('rCircle', 'assets/redCircle.png');
    game.load.spritesheet('buttonfire', 'assets/button-round.png',96,96);
    game.load.spritesheet('buttonhorizontal', 'assets/button-horizontal.png',96,64);
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
}

function create () {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //  Resize our game world to be a 3000 x 3000 square
    game.world.setBounds(0, 0, 3000, 3000);
	game.stage.disableVisibilityChange  = true;

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 960, 640, 'earth');
    flagzoneTop = game.add.tileSprite(0,0,3000,200,'flagzone');
    flagzoneTop.tint = 0x3090C7;
    flagzoneBottom = game.add.tileSprite(0,2800,3000,200,'flagzone');
    flagzoneBottom.tint = 0xF62217;

    game.physics.arcade.enableBody(flagzoneTop);
    game.physics.arcade.enableBody(flagzoneBottom);

    var middleLine = game.add.graphics(0,0);
    middleLine.moveTo(0,1495);
    middleLine.lineStyle(10,0xFFFFFF);
    middleLine.lineTo(3000, 1495);

    land.fixedToCamera = true;

    tanksList = {};

	player = new Tank(myId, game, tank, myTeam);
	tanksList[myId] = player;
	tank = player.tank;
    tank.team = myTeam;
    shadow = player.shadow;

    tank.bringToTop();

    if (!game.device.desktop){
        // Virtual Joystick
        buttonfire = game.add.button(800, 500, 'buttonfire', null, this, 0, 1, 0, 1);
        buttonfire.fixedToCamera = true;
        buttonfire.events.onInputOut.add(function(){player.move=false;});
        buttonfire.events.onInputDown.add(function(){player.move=true;});
        buttonfire.events.onInputUp.add(function(){player.move=false;});

        buttonleft = game.add.button(40, 520, 'buttonhorizontal', null, this, 0, 1, 0, 1);
        buttonleft.fixedToCamera = true;
        buttonleft.events.onInputOut.add(function(){player.left=false;});
        buttonleft.events.onInputDown.add(function(){player.left=true;});
        buttonleft.events.onInputUp.add(function(){player.left=false;});

        buttonright = game.add.button(180, 520, 'buttonhorizontal', null, this, 0, 1, 0, 1);
        buttonright.fixedToCamera = true;
        buttonright.events.onInputOut.add(function(){player.right=false;});
        buttonright.events.onInputDown.add(function(){player.right=true;});
        buttonright.events.onInputUp.add(function(){player.right=false;});
    }

    //logo = game.add.sprite(0, 200, 'logo');
    //logo.fixedToCamera = true;

    //game.input.onDown.add(removeLogo, this);

    game.camera.follow(tank);
    //game.camera.deadzone = new Phaser.Rectangle(200, 200, 610, 250);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

	//setTimeout(removeLogo, 1000);
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;

	player.input.left = cursors.left.isDown || player.left;
	player.input.right = cursors.right.isDown || player.right;
	player.input.up = cursors.up.isDown || player.move;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    game.physics.arcade.overlap(player.tank, flagzoneBottom, flag);
    game.physics.arcade.overlap(player.tank, flagzoneTop, flag);

    for (var i in tanksList){
        var curTank = tanksList[i];
        if(curTank.id == myId) continue;
        if(curTank.alive){
            game.physics.arcade.collide(player.tank, curTank.tank);
            curTank.update();
        }
    }
}

function render () {
}

function flag(targetTank, targetZone){
    if(tanksList[targetTank.id].team == 1 && targetZone == flagzoneBottom){
        tanksList[targetTank.id].hasFlag = true;
    } else if (tanksList[targetTank.id].team == 0 && targetZone == flagzoneTop){
        tanksList[targetTank.id].hasFlag = true;
    }
}
