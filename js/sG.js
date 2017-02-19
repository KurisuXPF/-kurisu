$(document).ready(function(){
    var level=3;//难度系数，最高5，最低2，表示出现多少个色块
    function setLevel(level){//根据层次显示课点击数量
        $(".wrap-in").empty();
        switch(level){
            case 5:$(".wrap-in").append("<div class=\"inline push mc4 unclickable\" id='4' ></div>");
            case 4:$(".wrap-in").append("<div class=\"inline push mc3 unclickable\" id='3' ></div>");
            case 3:$(".wrap-in").append("<div class=\"inline push mc2 unclickable\" id='2' ></div>");
            case 2:$(".wrap-in").append("<div class=\"inline push mc1 unclickable\" id='1' ></div>");
            default:$(".wrap-in").append("<div class=\"inline push mc0 unclickable\" id='0' ></div>");
        }
        $('.level-led').removeClass('level-led-on');
        $("#level"+level+"-led").addClass('level-led-on');
        $('.push').mousedown(function(){
            pushColor($(this));
        });
    }
    function setGameLevel(evt){
        var id=evt.target.id;
        var idnum = id.replace("level","");
        level=parseInt(idnum, 10);
        setLevel(level);
    }
    // 检测浏览器是否支持Web 音频 API
    var AudioContext = window.AudioContext // 默认
        || window.webkitAudioContext // 对于Safari或者老版本的Chrome
        || false;
    if(!AudioContext) {
        // 报警
        alert('抱歉，因为你的浏览器不支持Web音频功能。'
            + ' 请下载最新版本的'
            + 'Google Chrome或者Mozilla Firefox');
    } else {
        // 能够进行游戏
        var audioCtx = new AudioContext(); //web音频接口
        var frequencies = [630,470,415,310,252]; // 定义频率，对应值也可以是 => [415,310,252,209] [329.63,261.63,220,164.81];


        // 创建出错振荡器（后面也要用到）
        // 振荡器 有5种类型（sine/正弦、square/方、sawtooth/锯齿、triangle/三角和custom/定制）
        var errOsc = audioCtx.createOscillator();
        errOsc.type = 'triangle';
        errOsc.frequency.value = 110;
        errOsc.start(0.0); // 对于Safari的可选参数修正
        var errNode = audioCtx.createGain();
        errOsc.connect(errNode);
        errNode.gain.value = 0;
        errNode.connect(audioCtx.destination);
        var ramp = 0.1; //定义播放时间偏移
        var vol = 0.5;
        var gameStatus = {};
        gameStatus.reset = function(){
            this.init();
            this.strict = false;
        }
        gameStatus.init = function(){
            this.lastPush = $('#0');
            this.sequence = [];
            this.tStepInd = 0;
            this.index = 0;
            this.count = 0;
            this.lock = false;
            setLevel(level);
        };
        // 创建振荡器 5个音频的
        var oscillators = frequencies.map(function(frq){
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frq;
            osc.start(0.0);  // 对于Safari的可选参数修正
            return osc;
        });
        // 创建对应的播放增益调节5个
        var gainNodes = oscillators.map(function(osc){
            var g = audioCtx.createGain();
            osc.connect(g);
            g.connect(audioCtx.destination);
            g.gain.value = 0; //预设静音
            return g;
        });
        //播放某个节点
        function playGoodTone(num){
            gainNodes[num].gain
                .linearRampToValueAtTime(vol, audioCtx.currentTime + ramp);
            gameStatus.currPush = $('#'+num);
            gameStatus.currPush.addClass('liang');
        };

        // 停止正确播放节点
        function stopGoodTones(){
            if(gameStatus.currPush)
                gameStatus.currPush.removeClass('liang');
            gainNodes.forEach(function(g){
                g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + ramp);
            });
            gameStatus.currPush = undefined;
            gameStatus.currOsc = undefined;
        };
        //播放错误提醒
        function playErrTone(){
            errNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + ramp);
        };
        // 停止错误提醒
        function stopErrTone(){
            errNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + ramp);
        };
        // 开始游戏
        function gameStart(){
            resetTimers();
            stopGoodTones();
            stopErrTone();
            $('.count').text('--').removeClass('led-off');
            flashMessage('--',1);
            gameStatus.init();
            addStep();
        }
        // 设置每步间隔ms
        function setTimeStep(num){
            var tSteps = [1250 , 1000 , 750, 500 ];
            if (num < 4)
                return tSteps[0];
            if (num < 8)
                return tSteps[1];
            if (num < 12)
                return tSteps[2];
            return tSteps[3];
        }
        // 提醒错误
        function notifyError(pushObj){
            gameStatus.lock = true;
            $('.push').removeClass('clickable').addClass('unclickable');
            playErrTone();
            if(pushObj)
                pushObj.addClass('liang');
            gameStatus.toHndl = setTimeout(function(){
                stopErrTone();
                if(pushObj)
                    pushObj.removeClass('liang');
                gameStatus.toHndlSt = setTimeout(function(){
                    if(gameStatus.strict)
                        gameStart()
                    else
                        playSequence();
                },1000);
            },1000);
            flashMessage('!!',2);
        };
        // 提醒胜利
        function notifyWin(){
            var cnt = 0;
            var last = gameStatus.lastPush.attr('id');
            gameStatus.seqHndl = setInterval(function(){
                playGoodTone(last);
                gameStatus.toHndl = setTimeout(stopGoodTones,80);
                cnt++;
                if(cnt === 8){
                    clearInterval(gameStatus.seqHndl);
                }
            },160);
            flashMessage('**',2);
        }
        // 快闪消息
        function flashMessage(msg,times){
            $('.count').text(msg);
            var lf = function(){
                $('.count').addClass('led-off');
                gameStatus.toHndlFl = setTimeout(function(){
                    $('.count').removeClass('led-off');
                },250);
            };
            var cnt = 0;
            lf();
            gameStatus.flHndl = setInterval(function(){
                lf();
                cnt++;
                if(cnt === times)
                    clearInterval(gameStatus.flHndl);
            },500)
        };
        //显示计数
        function displayCount(){
            var p = (gameStatus.count < 10) ? '0' : '';
            $('.count').text(p+(gameStatus.count+''));
        }
        //播放音频
        function playSequence(){
            var i = 0;
            gameStatus.index = 0;
            gameStatus.seqHndl = setInterval(function(){
                displayCount();
                gameStatus.lock = true;
                playGoodTone(gameStatus.sequence[i]);
                gameStatus.toHndl = setTimeout(stopGoodTones,gameStatus.timeStep/2 - 10);
                i++;
                if(i === gameStatus.sequence.length){
                    clearInterval(gameStatus.seqHndl);
                    $('.push').removeClass('unclickable').addClass('clickable');
                    gameStatus.lock = false;
                    gameStatus.toHndl = setTimeout(notifyError,5*gameStatus.timeStep);
                }
            },gameStatus.timeStep);
        };
        // 添加步骤
        function addStep(){
            gameStatus.timeStep = setTimeStep(gameStatus.count++);
            gameStatus.sequence.push(Math.floor(Math.random()*level));
            gameStatus.toHndl=setTimeout(playSequence,500);
        };
        // 清除相应定时器
        function resetTimers(){
            clearInterval(gameStatus.seqHndl);
            clearInterval(gameStatus.flHndl);
            clearTimeout(gameStatus.toHndl);
            clearTimeout(gameStatus.toHndlFl);
            clearTimeout(gameStatus.toHndlSt);
        };
        // 放置颜色
        function pushColor(pushObj){
            if(!gameStatus.lock) {
                clearTimeout(gameStatus.toHndl);
                var pushNr = pushObj.attr('id');
                if( pushNr == gameStatus.sequence[gameStatus.index]
                    && gameStatus.index < gameStatus.sequence.length){
                    playGoodTone(pushNr);
                    gameStatus.lastPush = pushObj;
                    gameStatus.index++;
                    if(gameStatus.index < gameStatus.sequence.length){
                        gameStatus.toHndl = setTimeout(notifyError,5*gameStatus.timeStep);
                    }else if (gameStatus.index == 20){
                        $('.push').removeClass('clickable').addClass('unclickable');
                        gameStatus.toHndl = setTimeout(notifyWin,gameStatus.timeStep);
                    }else{
                        $('.push').removeClass('clickable').addClass('unclickable');
                        addStep();
                    }
                }else{
                    $('.push').removeClass('clickable').addClass('unclickable');
                    notifyError(pushObj);
                }
            }
        }
        // 鼠标交互实现 开始
        //难度切换按钮
        $('.level').click(setGameLevel);
        $('.push').mousedown(function(){
            pushColor($(this));
        });
        $('*').mouseup(function(e){
            e.stopPropagation();
            if(!gameStatus.lock)
                stopGoodTones();
        });
        // 鼠标交互实现 结束

        // 切换严格模式
        function toggleStrict(){
            $('#mode-led').toggleClass('led-on');
            gameStatus.strict = !gameStatus.strict;
        }

        // 开始开关交互处理
        $('.sw-slot').click(function(){
            $('#pwr-sw').toggleClass('sw-on');
            if($('#pwr-sw').hasClass('sw-on')==false){
                gameStatus.reset();
                $('.count').text('--');
                $('.count').addClass('led-off');
                $('#mode-led').removeClass('led-on');
                $('.push').removeClass('clickable').addClass('unclickable');
                $('#start').off('click');
                $('#mode').off('click');
                $('.btn').removeClass('clickable').addClass('unclickable');
                $('.level').removeClass('unclickable').addClass('clickable');
                $('.level').click(setGameLevel);
                resetTimers();
                stopGoodTones();
                stopErrTone();
            }else{
                $('.btn').removeClass('unclickable').addClass('clickable');
                $('.level').removeClass('clickable').addClass('unclickable');
                $('.count').removeClass('led-off');
                $('.level').off('click');
                $('#start').click(gameStart);
                $('#mode').click(toggleStrict);
            }
        });
        gameStatus.reset();
    }
});