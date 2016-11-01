var myId;
var myTeam;

var land;
var flagzoneTop;
var flagzoneBottom;
var shadow;
var hasFlag = false;
var team;
var tank;
var statusText;
var player;
var blueCircle;
var redCircle;
var playersList;
var logo;
var cursors;
var players;
var score;
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
        if (playersList[id]) {
            playersList[id].kill();
            console.log('killing ', id, playersList[id]);
        }
    }

    eurecaClient.exports.spawnEnemy = function(i, x, y, team)
    {
        if (i == myId) return; //this is me
        if(playersList[i] != null) return; //avoid duplicates
        console.log('Spawn %s %s %s', i, x, y);
        var tnk = new Tank(i, game, tank, team);
        tnk.tank.x = x;
        tnk.tank.y = y;
        playersList[i] = tnk;
    }

    eurecaClient.exports.updateState = function(id, state)
    {
        if(id == myId){
            playersList[id].score = state.score;
            playersList[id].cursor = state;
            playersList[id].update();
        }else if (playersList[id])  {
            playersList[id].cursor = state;
            game.add.tween(playersList[id].tank).to({x: state.x, y: state.y}, 50, null, true);
            //playersList[id].tank.x = state.x;
            //playersList[id].tank.y = state.y;
            playersList[id].tank.angle = state.angle;
            playersList[id].update();
        }
    }

    eurecaClient.exports.sendText = function(newText)
    {
        statusText.setText(newText);
        game.time.events.add(Phaser.Timer.SECOND * 3, resetText, this);
    }
}


Tank = function (index, game, player, team) {
    this.cursor = {
        left:false,
        right:false,
        up:false
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

    this.score = {red: 0, blue: 0};

    this.hasFlag = false;
    this.hasGoal = false;
    this.alive = true;

    this.lastUpdate = 0;

    this.shadow = game.add.sprite(x, y, 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy');
    this.redCircle = game.add.sprite(x, y, 'rCircle');
    this.blueCircle = game.add.sprite(x, y, 'bCircle');

    this.redCircle.visible = false;
    this.blueCircle.visible = false;

    this.tank.x = game.rnd.integerInRange(0,2000);

    if(this.team){
        this.tank.tint = 0x0000ff;
        this.tank.y = game.rnd.integerInRange(200,1500);
    }else{
        this.tank.tint = 0xff0000;
        this.tank.y = game.rnd.integerInRange(1500,2800);
    }

    this.tank.scale.setTo(0.3,0.3);
    this.redCircle.scale.setTo(0.5,0.5);
    this.blueCircle.scale.setTo(0.5,0.5);
    this.shadow.scale.setTo(0.7,0.7);

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.redCircle.anchor.set(0.5);
    this.blueCircle.anchor.set(0.5);

    this.tank.id = index;
    game.physics.arcade.enable(this.tank);
    this.tank.body.drag.set(300);
    this.tank.body.maxVelocity.set(350);
    this.tank.body.collideWorldBounds = true;

    this.tank.angle = 0;
};

Tank.prototype.update = function() {

    // var inputChanged = (
    //     this.cursor.left != this.input.left ||
    //     this.cursor.right != this.input.right ||
    //     this.cursor.up != this.input.up
    // );

    //if (inputChanged)
    if(Date.now() - this.lastUpdate > 50)
    {
        this.lastUpdate = Date.now();
        //Handle input change here
        //send new values to the server
        if (this.tank.id == myId)
        {
            // send latest valid state to the server
            this.input.x = this.tank.x;
            this.input.y = this.tank.y;
            this.input.angle = this.tank.angle;
            this.input.hasFlag = this.hasFlag;
            this.input.hasGoal = this.hasGoal;
            this.input.team = this.team;

            eurecaServer.handleKeys(this.input);
        }
    }

    //cursor value is now updated by eurecaClient.exports.updateState method

    this.hasGoal = this.cursor.hasGoal;
    this.hasFlag = this.cursor.hasFlag;

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
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 200, this.tank.body.acceleration);
    } else{
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 0, this.tank.body.acceleration);
    }

    if(this.cursor.hasFlag){
        if(this.team == 1)
        this.redCircle.visible = true;
        else
        this.blueCircle.visible = true;
    } else{
        this.redCircle.visible = false;
        this.blueCircle.visible = false;
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
    delete playersList[this.tank.id];
    this.alive = false;
    this.tank.kill();
    this.shadow.kill();
    this.redCircle.kill();
    this.blueCircle.kill();
};

var game = new Phaser.Game(900, 500, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {
    //game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    //game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('enemy', 'assets/RD2.png');
    game.load.image('shadow', 'assets/shadow.png')
    //game.load.image('logo', 'assets/logo.png');
    game.load.image('earth', 'assets/dark_grass.png');
    game.load.image('flagzone', 'assets/scorched_earth.png')
    game.load.image('bCircle', 'assets/bCircle.png');
    game.load.image('rCircle', 'assets/redCircle.png');
    game.load.spritesheet('buttonfire', 'assets/button-round.png',96,96);
    game.load.spritesheet('buttonhorizontal', 'assets/button-horizontal.png',96,64);
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.setMinMax(320, 178, 900, 500);
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.stage.smoothed = false;
}

function create () {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //  Resize our game world to be a 3000 x 3000 square
    game.world.setBounds(0, 0, 2000, 3000);
    game.stage.disableVisibilityChange  = true;

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 900, 500, 'earth');
    flagzoneTop = game.add.tileSprite(0,0,2000,200,'flagzone');
    flagzoneTop.tint = 0x3090C7;
    flagzoneBottom = game.add.tileSprite(0,2800,2000,200,'flagzone');
    flagzoneBottom.tint = 0xF62217;

    game.physics.arcade.enableBody(flagzoneTop);
    game.physics.arcade.enableBody(flagzoneBottom);

    var middleLine = game.add.graphics(0,0);
    middleLine.moveTo(0,1495);
    middleLine.lineStyle(10,0xFFFFFF);
    middleLine.lineTo(2000, 1495);
    middleLine.drawCircle(1000,1500,600);

    land.fixedToCamera = true;

    playersList = {};

    player = new Tank(myId, game, tank, myTeam);
    playersList[myId] = player;
    tank = player.tank;
    tank.team = myTeam;
    shadow = player.shadow;

    tank.bringToTop();

    if (!game.device.desktop){
        // Virtual Joystick
        buttonfire = game.add.button(750, 370, 'buttonfire', null, this, 0, 1, 0, 1);
        buttonfire.fixedToCamera = true;
        buttonfire.events.onInputOut.add(function(){player.move=false;});
        buttonfire.events.onInputDown.add(function(){player.move=true;});
        buttonfire.events.onInputUp.add(function(){player.move=false;});

        buttonleft = game.add.button(40, 400, 'buttonhorizontal', null, this, 0, 1, 0, 1);
        buttonleft.fixedToCamera = true;
        buttonleft.events.onInputOut.add(function(){player.left=false;});
        buttonleft.events.onInputDown.add(function(){player.left=true;});
        buttonleft.events.onInputUp.add(function(){player.left=false;});

        buttonright = game.add.button(180, 400, 'buttonhorizontal', null, this, 0, 1, 0, 1);
        buttonright.fixedToCamera = true;
        buttonright.events.onInputOut.add(function(){player.right=false;});
        buttonright.events.onInputDown.add(function(){player.right=true;});
        buttonright.events.onInputUp.add(function(){player.right=false;});
    }

    var style = {font: "48px Arial", fill: "#ffffff"};
    players = game.add.text(32,32, "Players: " + Object.keys(playersList).length,
                                {font: "14px Arial", fill: "#ffffff"});
    players.fixedToCamera = true;
    players.resolution = 1;

    score = game.add.text(820,32, "", {font: "14px Arial", fill: "#ffffff"});
    score.fixedToCamera = true;
    score.resolution = 1;

    statusText = game.add.text(game.camera.width/2,(game.camera.height/2)-150,"", style);
    statusText.fixedToCamera = true;
    statusText.anchor.setTo(0.5);
    statusText.resolution = 1;

    //logo = game.add.sprite(0, 200, 'logo');
    //logo.fixedToCamera = true;

    //game.input.onDown.add(removeLogo, this);

    game.camera.follow(tank);
    //game.camera.deadzone = new Phaser.Rectangle(200, 200, 610, 250);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

    //setTimeout(removeLogo, 1000);
}

// function removeLogo () {
//     game.input.onDown.remove(removeLogo, this);
//     logo.kill();
// }

function update () {
    //do not update if client not ready
    if (!ready) return;

    players.setText("Players: " + Object.keys(playersList).length);
    score.setText("Reds: " + playersList[myId].score.red + "\nBlues: " + playersList[myId].score.blue);

    player.input.left = cursors.left.isDown || player.left;
    player.input.right = cursors.right.isDown || player.right;
    player.input.up = cursors.up.isDown || player.move;
    player.input.tx = game.input.x+ game.camera.x;
    player.input.ty = game.input.y+ game.camera.y;

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    game.physics.arcade.overlap(player.tank, flagzoneBottom, tryFlag);
    game.physics.arcade.overlap(player.tank, flagzoneTop, tryFlag);

    for (var i in playersList){
        var curTank = playersList[i];
        if(curTank.alive){
            game.physics.arcade.collide(player.tank, curTank.tank, collision);
            curTank.update();
        }
    }
}

function render () {
}

function collision(playerTank, enemyTank){
    if(playersList[playerTank.id].hasFlag && (playersList[playerTank.id].team != playersList[enemyTank.id].team)){
        playersList[playerTank.id].hasFlag = false;
        eurecaServer.dropFlag(playersList[playerTank.id].team);
    }
}

function tryFlag(targetTank, targetZone){
    if(playersList[targetTank.id].team == 1 && targetZone == flagzoneBottom){
        playersList[targetTank.id].hasFlag = true;
    } else if (playersList[targetTank.id].team == 0 && targetZone == flagzoneTop){
        playersList[targetTank.id].hasFlag = true;
    }

    if(playersList[targetTank.id].team == 1 && targetZone == flagzoneTop && playersList[targetTank.id].hasFlag){
        playersList[targetTank.id].hasGoal = true;
    } else if (playersList[targetTank.id].team == 0 && targetZone == flagzoneBottom && playersList[targetTank.id].hasFlag){
        playersList[targetTank.id].hasGoal = true;
    }
}

function resetText(){
    statusText.setText("");
}
