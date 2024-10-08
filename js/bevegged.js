/*
 *
 * You're welcome to do with it whatever you like.
 * K.Kelly May 6 2012
 */

var vegger = new Class({
    Implements: [Options, Chain],
    options: {
        // SIZE
        width: 8,
        height: 8,
        tilewidth: 64,
        tileheight: 64,

        fieldid: "field",
        pausedfieldid: "pausedField",
        pointsid: "pointsId",
        timeid: "t",
        timebar: "timebar",
        levelid: "levelId",
        hintid: "hintId",
        tileid: "tiles",
        reqtileid: "ntiles",
        startid: "start",
        infoid: "info",

        colors: false,
        haslines: false,
        lines: false,
        needtile: false,
        nextempty: false,
        tile1: false,
        tile2: false,
        tile1bak: false,
        idle: false,
        tilecount: 0,
        points: 0,
        delay: 200,
        fps: 30,
        hint: false,
        time: 0,
        hintcount: 0,
        starthints: 6,
        periodical: false,

        gameIsRunning: false,
        gameIsPaused: false,

        gameover: "GAME OVER",
        nohintsleft: '<span style="color:red;" class="startHintsText">Click Start To Begin</span>',
        nomoves: "No Moves left!",

        level: 0,
        levels: {
            0: {
                tiles: 4,
                time: 320,
                reqtile: 60,
                text: "Veggerific!!",
            },
            1: {
                tiles: 4,
                time: 310,
                reqtile: 70,
                text: "Getting Healthy!",
            },
            2: {
                tiles: 5,
                time: 300,
                reqtile: 80,
                text: "Wow! You're good!",
            },
            3: {
                tiles: 5,
                time: 290,
                reqtile: 90,
                text: "Looking awesome!",
            },
            4: {
                tiles: 6,
                time: 280,
                reqtile: 100,
                text: "Super person!",
            },
            5: {
                tiles: 6,
                time: 260,
                reqtile: 110,
                text: "You rock!",
            },
            6: {
                tiles: 7,
                time: 250,
                reqtile: 120,
                text: "Woooot!",
            },
            7: {
                tiles: 7,
                time: 240,
                reqtile: 130,
                text: "Freakin Amazing!",
            },
            8: {
                tiles: 8,
                time: 230,
                reqtile: 140,
                text: "You're Grrreat!",
            },
            9: {
                tiles: 8,
                time: 220,
                reqtile: 150,
                text: "Spectacular!!!",
            },
        },
    },

    initialize: function (options) {
        let viewportHeight = window.innerHeight;
        let heightPercentage = 0.8;

        let gameArea = document.getElementById("gameArea");
        let gameHeightWidth = viewportHeight * heightPercentage;
        gameArea.style.width = gameArea.style.height = gameHeightWidth + "px";

        let gameField = document.getElementById("field");
        gameField.style.width = gameField.style.height = gameHeightWidth + "px";

        let infoArea = document.getElementById("infoArea");
        let newInfoArea = document.getElementById("newInfoArea");
        newInfoArea.style.height = infoArea.style.height = gameHeightWidth + "px";
        newInfoArea.style.width = infoArea.style.width = gameHeightWidth * 0.33 + "px";

        let tileWidthHeight = gameHeightWidth / 8;

        this.setOptions(options);

        this.options.tilewidth = this.options.tileheight = tileWidthHeight;

        $(this.options.startid).addEvent("click", this.startgame.bind(this));

        $("be_vegged").position();

        document.getElementById("timebar").onclick = function (ev) {
            // for debugging
            if (ev.ctrlKey) {
                this.options.time = 0;
            } else {
                this.options.time = this.options.levels[this.options.level].time;
                console.log(this.options.time);
            }
        }.bind(this);

        this.gamePausedField = document.getElementById("pausedField");

        // add a starter field
        this.setupfield();
        this.firstfill();
    },

    pauseGame: function () {
        if (!this.options.gameIsPaused) {
            this.options.gameIsPaused = true;
            this.gamePausedField.show();
            $(this.options.startid).innerHTML = "<span>Start</span>";
        } else {
            this.options.gameIsPaused = false;
            this.gamePausedField.hide();
            $(this.options.startid).innerHTML = "<span>Pause</span>";
        }
    },

    startgame: function () {
        if (this.options.gameIsRunning) {
            this.pauseGame();
            return;
        }

        this.options.hintcount = this.options.starthints;
        this.options.points = 0;
        this.options.level = 0;

        this.clearGame();

        $(this.options.hintid).removeEvents();
        $(this.options.hintid).addEvent("click", this.giveHint.bind(this));

        $(this.options.infoid).innerHTML = "Time Remaining";
        $(this.options.startid).innerHTML = "<span>Pause</span>";

        this.options.gameIsRunning = true;
        this.gamePausedField.hide();
    },

    clearGame: function () {
        this.options.tilecount = 0;
        this.chainreaction = 0;
        this.options.time = this.options.levels[this.options.level].time;

        this.setupfield();
        this.firstfill();
        this.updatePointsDisplay();
        this.updateLevelDisplay();
        this.updateTimeDisplay();
        this.checkmoves();
        this.updatehint();

        $clear(this.timer);
        // TODO timer runs before START is clicked
        // I think doTimer is the main game loop
        this.timer = this.doTimer.delay(1000, this);
        $(this.options.infoid).innerHTML = "Time Remaining";
    },

    setupfield: function () {
        this.field = new Hash();
        this.tiles = new Hash();
        this.freetiles = new Hash();
        this.fx = {};
        this.fxplode = {};
        this.fxplodetile = {};
        this.fxp = {};
        this.fxon = 0;

        $(this.options.fieldid).empty();

        var inner;
        var tilecount = 0;
        var tileid = false;
        var posid = false;

        for (var y = 0; y <= this.options.width - 1; y++) {
            for (var x = 0; x <= this.options.height - 1; x++) {
                tileid = "t" + tilecount;
                posid = x + "x" + y;

                this.field.set(posid, tileid);
                this.tiles.set(
                    tileid,
                    new Element("DIV", {
                        id: tileid,
                        class: "outer",
                        styles: {
                            position: "absolute",
                            "box-sizing": "border-box",
                            "background-repeat": "no-repeat",
                            "background-size": "100% 100%",
                            width: this.options.tilewidth + "px",
                            height: this.options.tileheight + "px",
                            top: y * this.options.tileheight + "px",
                            left: x * this.options.tilewidth + "px",
                            "z-index": 0,
                        },
                    })
                );
                inner = new Element("DIV", {
                    class: "inner",
                    styles: {
                        width: "100%",
                        height: "100%",
                    },
                });
                inner.inject(this.tiles[tileid]);
                this.tiles[tileid].inject(this.options.fieldid);

                this.fx[tileid] = new Fx.Morph($("t" + tilecount), {
                    duration: this.options.delay,
                    wait: false,
                    transition: Fx.Transitions.Circ.easeOut,
                    fps: this.options.fps,
                    onComplete: this.onFxComplete.bind(this),
                    onStart: this.onFxStart.bind(this),
                });

                this.tiles[tileid].drag = new Drag.Move($(this.tiles[tileid]), {
                    snap: 0,
                    onBeforeStart: function (el) {
                        var xx = el.getStyle("left").toInt();
                        var yy = el.getStyle("top").toInt();
                        this.restore = {
                            x: xx,
                            y: yy,
                        };

                        var x1 = xx - this.options.tilewidth < 0 ? 0 : xx - this.options.tilewidth;
                        var y1 = yy - this.options.tilewidth < 0 ? 0 : yy - this.options.tilewidth;
                        var x2 =
                            xx + this.options.tilewidth > (this.options.height - 1) * this.options.tilewidth
                                ? (this.options.height - 1) * this.options.tilewidth
                                : xx + this.options.tilewidth;
                        var y2 =
                            yy + this.options.tileheight > (this.options.height - 1) * this.options.tilewidth
                                ? (this.options.height - 1) * this.options.tilewidth
                                : yy + this.options.tileheight;

                        el.drag.options.limit = {
                            x: [x1, x2],
                            y: [y1, y2],
                        };
                        $(el).setStyle("z-index", 500);
                    }.bind(this),

                    onComplete: function (el) {
                        var xx = el.getStyle("left").toInt();
                        var yy = el.getStyle("top").toInt();

                        this.options.tile1 = this.getTileId(
                            Math.round(xx / this.options.tilewidth),
                            Math.round(yy / this.options.tileheight)
                        );
                        this.options.tile2 = this.getTileId(
                            Math.round(this.restore.x / this.options.tilewidth),
                            Math.round(this.restore.y / this.options.tileheight)
                        );

                        $(el).setStyle("left", this.restore.x);
                        $(el).setStyle("top", this.restore.y);
                        $(el).setStyle("z-index", 0);
                        this.swapTiles();
                    }.bind(this),
                });
                tilecount++;
            }
        }
    },

    onFxStart: function () {
        this.fxon++;
    },

    onFxComplete: function () {
        this.fxon--;
    },

    firstfill: function () {
        var tile = false;

        for (var x = this.options.width - 1; x >= 0; x--) {
            for (var y = this.options.height - 1; y >= 0; y--) {
                tile = this.getRandomTile();

                while (
                    (tile === this.getTile(x + 1, y) && tile === this.getTile(x + 2, y)) ||
                    (tile === this.getTile(x, y + 1) && tile === this.getTile(x, y + 2))
                ) {
                    tile = this.getRandomTile(this.getTile(x + 1, y), this.getTile(x, y + 1));
                }

                this.setTile(x, y, tile);

                var tileid = this.getTileId(x, y);
                $(tileid).setStyles({
                    top: -this.options.tileheight + "px",
                    left: x * this.options.tilewidth + "px",
                });
                this.fx[tileid].start({
                    top: y * this.options.tileheight,
                });
            }
        }
    },

    pushFreetile: function (tileid) {
        if (!this.freetiles.has(tileid)) this.freetiles.set(tileid, true);
    },

    popFreetile: function () {
        var keys = this.freetiles.getKeys();

        if (keys[0]) {
            this.freetiles.erase(keys[0]);
            return keys[0];
        }

        return false;
    },

    getTile: function (x, y) {
        if (!this.checkPos(x, y)) return false;

        if (!this.getTileId(x, y)) return false;

        return $(this.getTileId(x, y)).className;
    },

    getRandomTile: function (t1, t2) {
        var tile;
        while (tile == t1 || tile == t2 || !tile)
            tile = "s" + $random(1, this.options.levels[this.options.level].tiles);

        return tile;
    },

    getTileId: function (x, y) {
        if (!this.checkPos(x, y)) return false;

        if (!this.field.get(x + "x" + y)) return false;

        return this.field.get(x + "x" + y);
    },

    setTile: function (x, y, tile) {
        if (!this.checkPos(x, y)) return false;

        var tileid = this.getTileId(x, y);

        if (!tileid) return false;

        $(tileid).setProperty("class", tile);
        $(tileid).setStyle("display", "block");

        return true;
    },

    getTilePos: function (tileid) {
        var key = this.field.keyOf(tileid);
        var xy = key.split("x");

        return {
            x: parseInt(xy[0]),
            y: parseInt(xy[1]),
        };
    },

    clearTile: function (x, y) {
        if (!this.checkPos(x, y)) return false;

        var tileid = this.getTileId(x, y);

        if (!tileid) return false;

        this.fxplodetile[tileid] = new Element("DIV", {
            id: "ex" + tileid,
            class: $(tileid).getProperty("class"),
            styles: {
                position: "absolute",
                "box-sizing": "border-box",
                "background-repeat": "no-repeat",
                "background-size": "100% 100%",
                width: this.options.tilewidth + "px",
                height: this.options.tileheight + "px",
                top: y * this.options.tileheight + "px",
                left: x * this.options.tilewidth + "px",
            },
        }).injectInside($(this.options.fieldid));

        var xx =
            this.options.tilewidth * x -
            $random(0, this.options.tilewidth * 2) +
            $random(0, this.options.tilewidth * 2);
        var yy = 9 * this.options.tileheight;

        this.fxplode[tileid] = new Fx.Morph($("ex" + tileid), {
            duration: this.options.delay * 4,
            wait: false,
            transition: Fx.Transitions.Circ.easeIn,
            fps: this.options.fps,
            onComplete: this.onFxplodeComplete.bind(this),
        });

        this.fxplode[tileid].start.delay(10, this.fxplode[tileid], {
            top: yy,
            left: xx,
            opacity: 0.4,
        });

        $(tileid).removeClass($(tileid).className);

        $(tileid).setStyle("display", "none");

        this.pushFreetile(tileid);

        this.field.set(x + "x" + y, false);
    },

    onFxplodeComplete: function (e) {
        $(e.id).destroy();
    },

    checkPos: function (x, y) {
        if (x < 0 || x > this.options.height - 1) return false;

        if (y < 0 || y > this.options.width - 1) return false;

        return true;
    },

    resetTilePos: function (x, y) {
        var id = this.popFreetile();

        if (!id) return false;

        if (y == 0) {
            $(id).setStyles({
                top: -this.options.tileheight + "px",
                left: x * this.options.tilewidth + "px",
            });
            this.fx[id].start({
                top: 0,
            });
        } else {
            $(id).setStyles({
                top: y * this.options.tileheight + "px",
                left: x * this.options.tilewidth + "px",
            });
        }

        this.field.set(x + "x" + y, id);
    },

    addLine: function () {
        this.options.addLinerunning = true;

        var line = false;
        for (var x = 0; x <= this.options.width - 1; x++) {
            if (!this.getTile(x, 0)) {
                line = true;
                this.resetTilePos(x, 0);
                this.setTile(x, 0, this.getRandomTile());
            }
        }

        this.options.addLinerunning = false;
        return line;
    },

    gravity: function () {
        this.options.gravityrunning = true;

        var id = false;

        for (var y = this.options.height - 2; y >= 0; y--) {
            for (var x = this.options.width - 1; x >= 0; x--) {
                // is this tile empty
                if (!this.getTile(x, y + 1) && this.getTile(x, y)) {
                    // now determine how many fields the stone must fall
                    var depth = 0;
                    for (var yy = y; yy <= this.options.height - 1; yy++) {
                        if (!this.getTile(x, yy)) depth++;
                    }

                    id = this.getTileId(x, y);

                    if (id != "false") {
                        // animation start
                        this.fx[id].start({
                            top: $(id).getStyle("top").toInt() + this.options.tileheight * depth,
                        });

                        this.field.set(x + "x" + (y + depth), id);
                        this.field.set(x + "x" + y, false);
                    }
                }
            }
        }

        this.options.gravityrunning = false;

        if (id != "false") return true;
        else return false;
    },

    swapTiles: function () {
        if (!this.options.tile1 || !this.options.tile2) return false;

        var t1 = this.getTilePos($(this.options.tile1).id);
        var t2 = this.getTilePos($(this.options.tile2).id);

        if (!this.checkSwap(t1, t2)) return false;

        var tc1 = this.getTile(t1.x, t1.y);
        var tc2 = this.getTile(t2.x, t2.y);

        this.setTile(t1.x, t1.y, tc2);
        this.setTile(t2.x, t2.y, tc1);

        this.chain(this.tumble.delay(10, this));
    },

    tumble: function () {
        if (this.highlight) this.highlight.setStyle("border", "0px solid red");

        // do we have some running tasks? (important for slow machines)
        if (this.options.checklinesrunning || this.options.addLinerunning || this.options.gravityrunning) {
            conslole.log("abort tumble");
            return;
        }

        // do we have running animations?
        if (this.fxon != 0) {
            this.chain(this.tumble.delay(100, this));
            return;
        }

        // let the tiles fall
        if (!this.gravity()) {
            // this.chain(this.tumble.delay(10000,this));
            // return;
        }

        if (this.levelpause) return;

        // wo we have clean tiles on top?
        if (this.addLine()) {
            this.chain(this.tumble.delay(10, this));
            return;
        }

        // do we have lines?
        else if (this.check_lines()) {
            // yes - delete tiles / lines
            this.chain(this.deleteLines.delay(this.options.delay, this));
            return;
        }

        if (this.chainreaction > 2) {
            this.options.points = this.options.points + this.chainreaction * this.chainreaction * 50;
        }

        // no more moves?
        if (!this.checkmoves()) {
            this.noMoves();
        }

        // next level?
        if (this.options.tilecount >= this.options.levels[this.options.level].reqtile) {
            this.nextLevel();
        }

        this.chainreaction = 0;
    },

    noMoves: function () {
        $(this.options.infoid).innerHTML = this.options.nomoves;
        this.chain(this.doNewMoves.delay(3000, this));

        for (var x = 0; x <= this.options.height - 1; x++) {
            for (var y = 0; y <= this.options.width - 1; y++) {
                this.clearTile(x, y);
            }
        }
    },

    doNewMoves: function () {
        this.setupfield();
        this.firstfill();
        $(this.options.infoid).innerHTML = "";
    },

    giveHint: function (e) {
        if (this.options.hint && this.options.hintcount > 0) {
            var id = this.getTileId(this.options.hint[0].x, this.options.hint[0].y);
            this.highlight = $(id);
            this.highlight.setStyle("border", "3px solid red");
            this.options.hintcount--;
            this.updatehint();
            this.options.nohintsleft = "No hints left";
        }
    },

    updatehint: function () {
        var x = "";
        if (this.options.hintcount > 0) {
            for (var h = 0; h <= this.options.hintcount - 1; h++) {
                x = x + ' <img width="14" height="14" src="img/heart.png"> ';
            }
        } else {
            x = this.options.nohintsleft;
        }
        $(this.options.hintid).innerHTML = x;
    },

    checkSwap: function (t1, t2) {
        // tiles must lie side by side
        var xok = Math.abs((t1.x + t2.x) / 2 - t1.x);
        var yok = Math.abs((t1.y + t2.y) / 2 - t1.y);
        if (xok + yok != 0.5) return false;

        // valid path?
        if (this.hasMoves(t1, t2) || this.hasMoves(t2, t1)) return true;

        return false;
    },

    // test paths
    hasMoves: function (t1, t2) {
        this.options.hint = false;

        if (t1.x < 0 || t1.x > this.options.width - 1) return false;

        if (t1.y < 0 || t1.y > this.options.height - 1) return false;

        if (t2.x < 0 || t2.x > this.options.width - 1) return false;

        if (t2.y < 0 || t2.y > this.options.height - 1) return false;

        // 2 tiles up
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x - 1, t2.y) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x - 2, t2.y) &&
            t1.x != t2.x - 1
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x - 1,
                    y: t2.y,
                },
                {
                    x: t2.x - 2,
                    y: t2.y,
                },
            ];
            return true;
        }

        // 2 tiles down
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x + 1, t2.y) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x + 2, t2.y) &&
            t1.x != t2.x + 1
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x + 1,
                    y: t2.y,
                },
                {
                    x: t2.x + 2,
                    y: t2.y,
                },
            ];
            return true;
        }

        // tiles up & down
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x + 1, t2.y) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x - 1, t2.y) &&
            t1.y != t2.y
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x + 1,
                    y: t2.y,
                },
                {
                    x: t2.x - 1,
                    y: t2.y,
                },
            ];
            return true;
        }

        // 2 tiles left
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y - 1) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y - 2) &&
            t1.y != t2.y - 1
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x,
                    y: t2.y - 1,
                },
                {
                    x: t2.x,
                    y: t2.y - 2,
                },
            ];
            return true;
        }

        // 2 tiles right
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y + 1) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y + 2) &&
            t1.y != t2.y + 1
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x,
                    y: t2.y + 1,
                },
                {
                    x: t2.x,
                    y: t2.y + 2,
                },
            ];
            return true;
        }

        // tiles left & right
        if (
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y + 1) &&
            this.getTile(t1.x, t1.y) == this.getTile(t2.x, t2.y - 1) &&
            t1.x != t2.x
        ) {
            this.options.hint = [
                {
                    x: t1.x,
                    y: t1.y,
                },
                {
                    x: t2.x,
                    y: t2.y + 1,
                },
                {
                    x: t2.x,
                    y: t2.y - 1,
                },
            ];
            return true;
        }

        return false;
    },

    checkmoves: function () {
        for (var x = 0; x <= this.options.height - 1; x++) {
            for (var y = 0; y <= this.options.width - 1; y++) {
                if (
                    this.hasMoves(
                        {
                            x: x - 1,
                            y: y,
                        },
                        {
                            x: x,
                            y: y,
                        }
                    )
                )
                    return true;

                if (
                    this.hasMoves(
                        {
                            x: x + 1,
                            y: y,
                        },
                        {
                            x: x,
                            y: y,
                        }
                    )
                )
                    return true;

                if (
                    this.hasMoves(
                        {
                            x: x,
                            y: y - 1,
                        },
                        {
                            x: x,
                            y: y,
                        }
                    )
                )
                    return true;

                if (
                    this.hasMoves(
                        {
                            x: x,
                            y: y + 1,
                        },
                        {
                            x: x,
                            y: y,
                        }
                    )
                )
                    return true;
            }
        }

        return false;
    },

    check_lines: function () {
        this.options.checklinesrunning = true;

        var left_count = [];
        var top_count = 0;
        var lines = new Hash();
        var count = 0;
        var count2 = 0;

        for (var x = 0; x <= this.options.width - 1; x++) {
            for (var y = 0; y <= this.options.height - 1; y++) {
                // colcheck
                if (y == 0 || this.getTile(x, y) == 0) top_count = 0;

                if (this.getTile(x, y) == this.getTile(x, y - 1)) top_count++;

                if (this.getTile(x, y) != this.getTile(x, y + 1)) {
                    if (top_count >= 2) {
                        lines[count++] = {
                            type: "col",
                            size: top_count + 1,
                            x: x,
                            y: y - top_count,
                        };
                    }
                    top_count = 0;
                }

                // rowcheck
                if (x == 0 || this.getTile(x, y) == 0) {
                    left_count[y] = 0;
                }

                if (this.getTile(x, y) == this.getTile(x - 1, y)) {
                    left_count[y]++;
                }

                if (this.getTile(x, y) != this.getTile(x + 1, y)) {
                    if (left_count[y] >= 2) {
                        lines[count++] = {
                            type: "row",
                            size: left_count[y] + 1,
                            x: x - left_count[y],
                            y: y,
                        };
                    }
                    left_count[y] = 0;
                }
            }
        }

        if (count > 0) {
            this.options.haslines = true;
            this.options.lines = lines;
        } else {
            this.options.haslines = false;
            this.options.lines = false;
        }

        this.options.checklinesrunning = false;

        return this.options.haslines;
    },

    deleteLines: function () {
        if (!this.options.lines) return;

        var bonus = 0;
        this.options.lines.each(
            function (value, key) {
                if (value.type == "row") {
                    this.chainreaction++;
                    for (var i = value.x; i < value.x + value.size; i++) {
                        this.clearTile(i, value.y);
                        this.options.points = this.options.points + 10;
                        this.pointEffect(i, value.y, 10);
                        this.options.tilecount++;
                    }

                    this.options.time = this.options.time + 1;

                    if (value.size > 3) {
                        this.options.points = this.options.points + value.size * 10;
                        this.options.time = this.options.time + 3;
                    }

                    bonus++;
                } else if (value.type == "col") {
                    this.chainreaction++;
                    for (var i = value.y; i < value.y + value.size; i++) {
                        this.clearTile(value.x, i);
                        this.options.points = this.options.points + 10;
                        this.pointEffect(value.x, i, 10);
                        this.options.tilecount++;
                    }

                    this.options.time = this.options.time + 1;

                    if (value.size > 3) {
                        this.options.points = this.options.points + value.size * 10;
                        this.options.time = this.options.time + 3;
                    }

                    bonus++;
                }
            }.bind(this)
        );

        if (bonus > 1) {
            this.options.points = this.options.points + bonus * 50;
        }

        this.updatePointsDisplay();

        this.chain(this.tumble.delay(this.options.delay * 2, this));
    },

    doTimer: function () {
        if (!this.options.gameIsPaused) {
            this.options.time--;
            this.updateTimeDisplay();

            if (this.options.time <= 0) this.gameOver();
        }

        this.timer = this.doTimer.delay(1000, this);
    },

    gameOver: function () {
        $clear(this.chain);
        $clear(this.timer);
        $(this.options.infoid).innerHTML = this.options.gameover;
        for (var x = 0; x <= this.options.height - 1; x++) {
            for (var y = 0; y <= this.options.width - 1; y++) {
                this.clearTile(x, y);
            }
        }
    },

    nextLevel: function () {
        //$clear(this.chain);
        this.levelpause = true;
        $clear(this.timer);
        $(this.options.infoid).innerHTML = this.options.levels[this.options.level].text;
        // TODO delay between levels seems too long with just a blank screen
        // maybe show some animation like fireworks but changing this from 3000
        // to 1000
        this.chain(this.doNextLevel.delay(1000, this));
        for (var x = 0; x <= this.options.height - 1; x++) {
            for (var y = 0; y <= this.options.width - 1; y++) {
                this.clearTile(x, y);
            }
        }
    },

    doNextLevel: function () {
        // 10 level at the moment
        this.options.level++;
        if (this.options.level > 9) this.options.level = 9;
        this.clearGame();
        this.levelpause = false;
    },

    updatePointsDisplay: function () {
        $(this.options.pointsid).innerHTML = "Points: " + this.options.points;
        $(this.options.tileid).innerHTML = this.options.tilecount;
        $(this.options.reqtileid).innerHTML = this.options.levels[this.options.level].reqtile;
    },

    updateLevelDisplay: function () {
        $(this.options.levelid).innerHTML = "Level: " + (this.options.level + 1);
    },

    updateTimeDisplay: function () {
        var levelTime = this.options.levels[this.options.level].time;
        $(this.options.timeid).innerHTML = this.options.time + " " + levelTime;
        var barpos = this.options.time * (200 / levelTime) - 200;
        if (barpos > 0) barpos = 0;
        $(this.options.timebar).setStyle("background-position", "" + barpos + "px 0px");

        $(this.options.infoid).innerHTML = "Time Used: " + this.options.time + " of " + levelTime;
    },

    // shows animated point number where tiles start falling
    pointEffect: function (x, y, points) {
        this.fxp[x + "_" + y] = new Element("DIV", {
            id: "p" + x + "_" + y,
            class: "points",
            styles: {
                position: "absolute",
                width: this.options.tilewidth,
                height: this.options.tileheight * 0.3,
                top: y * this.options.tileheight + this.options.tileheight / 4 + "px",
                left: x * this.options.tilewidth + "px",
            },
        }).injectInside($(this.options.fieldid));

        this.fxp[x + "_" + y].innerHTML = points;

        this.fxp[x + "_" + y] = new Fx.Morph($("p" + x + "_" + y), {
            duration: this.options.delay * 10,
            wait: false,
            transition: Fx.Transitions.Sine.easeInOut,
            fps: this.options.fps,
            onComplete: this.onFxplodeComplete.bind(this),
        });

        this.fxp[x + "_" + y].start({
            top: y * this.options.tileheight + 8 - this.options.tileheight * 2 + "px",
            opacity: 0.4,
        });
    },
});

window.onresize = function (e) {
    $("be_vegged").position();
};

window.addEvent("domready", function () {
    var game_play = new vegger();
});
