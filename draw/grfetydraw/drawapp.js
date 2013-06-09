(function(root){

    //set up namespace
    var drawapp = typeof exports != 'undefined' ? exports : root.drawapp = {}

    // set stored x/y position to current touch/cursor location
    function setXY(e){
        var headerheight = document.getElementsByTagName('header')[0].offsetHeight;
        if (e.targetTouches){
            drawapp.x = e.targetTouches[0].pageX;
            drawapp.y = e.targetTouches[0].pageY - headerheight;
        } else {
            drawapp.x = e.pageX;
            drawapp.y = e.pageY - headerheight;
        }
    }

    // draw line from last x/y to current x/y and add coords to path buffer
    function draw(e){
        with(drawapp.context){
            if (drawapp.down){
                setXY(e);
                if (e.button === 2) {
                    drawapp.c = 'rgb(0,0,0)';
                }
                var line = {
                    'x':drawapp.x,
                    'y':drawapp.y,
                    'c':drawapp.c,
                    'w':drawapp.w,
                    'b':drawapp.b
                };
                drawapp.path.push(line);
                if (drawapp.path.length > 1){
                    drawapp.brushes[drawapp.b].draw(line)
                }
            }
        }
    }

    // start a new path buffer
    function start(e){
        drawapp.down = true;
        drawapp.path = [];
        setXY(e);
    }

    // send current path buffer to server
    function end(e){
        drawapp.down = false;
        sock.send(JSON.stringify({'type':'path','path':drawapp.path}))
    }

    // save the canvas to a file
    function save(){
        var buffer = drawapp.context;
        var w = buffer.canvas.width;
        var h = buffer.canvas.height;
        with(buffer){
            globalCompositeOperation = "destination-over"
            fillStyle = 'black';
            fillRect(0,0,w,h);
            window.open(buffer.canvas.toDataURL("image/png"),'_blank');
        }
    }

    //toggle sidebar visibility
    function toggleaside(e){
        var aside = document.getElementsByTagName('aside')[0];
        if (aside.style.display == 'none'){
            aside.style.display = 'block';
        } else {
            aside.style.display = 'none';
        }
        setXY(e);
    }

    // make browser fullscreen
    function fullscreen(){
        var doc = document.documentElement;
        if (doc.requestFullscreen) {
            doc.requestFullscreen();
        }
        else if (doc.mozRequestFullScreen) {
            doc.mozRequestFullScreen();
        }
        else if (doc.webkitRequestFullScreen) {
            doc.webkitRequestFullScreen();
        }
    }

    // connect to server, and re-connect if disconnected
    function connect(){
        sock = new SockJS('http://'+document.domain+':'+location.port+'/sjs');
        sock.onopen = function() {
            console.log('connected');
        };
        sock.onmessage = function(msg) {
            var data = JSON.parse(msg.data);
            if (data.type == 'snapshot'){
                window.snapshot = new Image();
                window.snapshot.onload = function(){
                    drawapp.context.drawImage(window.snapshot,0,0);
                }
                window.snapshot.src = data.snapshot;
            }
            if (data.type == 'path'){
                with(drawapp.context){
                    drawapp.path = []
                    while(data.path.length > 0){
                        var item = data.path.pop()
                        drawapp.path.push(item);
                        if (drawapp.path.length > 1){
                            drawapp.brushes[item.b].draw(item)
                        }
                    };
                    drawapp.path = []
                };
            }
            if (data.type == 'stats'){
                var usercount = document.getElementById('usercount');
                usercount.innerHTML= data.usercount;
            }
        };
        sock.onclose = function() {
            console.log('disconnected');
            setTimeout(function(){connect();},1000);
        };
    }


    //toggle active tool in sidebar
    function swapClass(e,cl){
        var buttons = document.getElementsByClassName(cl);
        Array.prototype.slice.call(buttons, 0).forEach(function(el){
            el.className = 'color';
        })
        e.toElement.className += " "+cl;
    }

    //main initialization routine
    function init(){

        // set up brush select box

        var select = document.getElementsByTagName('select')[0];
        Object.keys(drawapp.brushes).forEach(function(brush){
            var option = new Option(brush,brush);
            select.options[select.options.length] = option;
        })


        // build canvas and set up events
        drawapp.canvas = document.getElementsByTagName('canvas')[0];
        drawapp.context = drawapp.canvas.getContext('2d');
        with(drawapp.context){
            canvas.style.position = 'fixed';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            window.onresize = function(){
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                drawImage(window.snapshot,0,0);
            }
            canvas.addEventListener('mousedown', start);
            canvas.addEventListener('touchstart', start);
            canvas.addEventListener('touchend', end);
            canvas.addEventListener('mouseup', end);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('touchmove', draw);
            canvas.addEventListener('contextmenu', function(e){
                if (e.button === 2){
                    e.preventDefault();
                    return false;
                }
            },0)
        }



        // set up toolbar events
        with(document){
            getElementById('color1').style.background = drawapp.color1;
            getElementById('color2').style.background = drawapp.color2;
            getElementById('color3').style.background = drawapp.color3;
            addEventListener("fullscreenchange", toggleaside, false);
            addEventListener("mozfullscreenchange", toggleaside, false);
            addEventListener("webkitfullscreenchange", toggleaside, false);
            getElementsByTagName('select')[0].addEventListener('change', function(e){
                drawapp.b = e.target.value;
            });
            getElementById('save').addEventListener('click', function(e){
                e.preventDefault();
                save()
                return false;
            });
            getElementById('sizerange').addEventListener('change', function(e){
                drawapp.w = e.target.value;
            });
            getElementById('alpharange').addEventListener('change', function(e){
                drawapp.a = e.target.value;
                drawapp.context.globalAlpha = e.target.value / 100;
            });
            getElementById('color1').addEventListener('click', function(e){
                swapClass(e,'activecolor');
                drawapp.c = drawapp.color1;
                drawapp.colora = drawapp.color1;
            });
            getElementById('color2').addEventListener('click', function(e){
                swapClass(e,'activecolor');
                drawapp.c = drawapp.color2;
                drawapp.colora = drawapp.color2;
            });
            getElementById('color3').addEventListener('click', function(e){
                swapClass(e,'activecolor');
                drawapp.c = drawapp.color3;
                drawapp.colora = drawapp.color3;
            });
        }

        // hide address bar for Android
        if (window.navigator.userAgent.match('/Android/i')){
            setTimeout(function(){
                canvas.height = window.innerHeight + 60;
                window.scrollTo(0,1);
            }, 0);
        }

        // connect to server
        connect();
    }

    // global exports

    drawapp.init = init;
    drawapp.w = 1;
    drawapp.c = 'rgb(255,255,255)';
    drawapp.b = 'pencil';
    drawapp.color1 = 'rgb(180,0,0)';
    drawapp.color2 = 'rgb(0,180,0)';
    drawapp.color3 = 'rgb(0,0,180)';
    drawapp.colora = drawapp.color1;
    drawapp.init = init;
    drawapp.brushes = {};

    // brush modules

    drawapp.brushes['pencil'] = {
        draw : function(line){
            with(drawapp.context){
                strokeStyle = line.c;
                lineWidth = line.w;
                beginPath();
                moveTo(
                    drawapp.path[drawapp.path.length -1].x,
                    drawapp.path[drawapp.path.length -1].y
                );
                lineTo(
                    drawapp.path[drawapp.path.length -2].x,
                    drawapp.path[drawapp.path.length -2].y
                );
                stroke();
            }
        }
    }

    drawapp.brushes['randlines'] = {
        rand : function(){
            return Math.random()*3-1.5;
        },
        draw : function(line){
            with(drawapp.context){
                strokeStyle = line.c;
                lineWidth = 0.05;
                for (i=1;i<50;i++){
                    beginPath();
                    moveTo(
                        drawapp.path[drawapp.path.length -1].x + this.rand() * line.w,
                        drawapp.path[drawapp.path.length -1].y + this.rand() * line.w
                    );
                    lineTo(
                        drawapp.path[drawapp.path.length -2].x + this.rand() * line.w,
                        drawapp.path[drawapp.path.length -2].y + this.rand() * line.w
                    );
                    stroke();
                }
            }
        }
    }

    drawapp.brushes['fishnet'] = {
        draw : function(line){
            with(drawapp.context){
                strokeStyle = line.c;
                lineWidth = line.w / 100 * 5;
                if (drawapp.path.length > 15){
                    for (i=1;i<15;i++){
                        beginPath();
                        moveTo(
                            drawapp.path[drawapp.path.length -1].x,
                            drawapp.path[drawapp.path.length -1].y
                        );
                        lineTo(
                            drawapp.path[drawapp.path.length -i].x,
                            drawapp.path[drawapp.path.length -i].y
                        );
                        stroke();
                    }
                }
            }
        }
    }

    drawapp.brushes['furry'] = {
        draw : function(line){
            with(drawapp.context){
                strokeStyle = line.c;
                lineWidth = line.w / 100 * 5;
                for (var i=1;i<drawapp.path.length;i++){
                    var e = -Math.random()
                    var b = drawapp.path[drawapp.path.length -1].x - drawapp.path[drawapp.path.length -i].x
                    var a = drawapp.path[drawapp.path.length -1].y - drawapp.path[drawapp.path.length -i].y
                    var h = b * b + a * a;
                    if (h < (2000*line.w) && Math.random() > h / (2000*line.w)) {
                        beginPath();
                        moveTo(
                            drawapp.path[drawapp.path.length -2].x + (b * e),
                            drawapp.path[drawapp.path.length -2].y + (a * e)
                        );
                        lineTo(
                            drawapp.path[drawapp.path.length -1].x - (b * e) + e * 2,
                            drawapp.path[drawapp.path.length -1].y - (a * e) + e * 2
                        );
                        stroke();
                    }
                }
            }
        }
    }

})(this);
