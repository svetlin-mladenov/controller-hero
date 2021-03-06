SC.initialize({
  client_id: '2956a6365e5f1d3b561d935a5392e53f'
});

var audioTagQ = {};
var audioTagQNextKey = 0;
(function() {
    var wrappedCreateElement = document.createElement;
    document.createElement = function createElement(name) {
        var res = wrappedCreateElement.call(this, name);
        if (name === 'audio') {
            res.crossOrigin = "anonymous";
            audioTagQ[audioTagQNextKey++] = {elem: res, checked: 0};
        }
        return res;
    };
})();

window.setInterval(function() {
    // here is how a tipical sc audio element looks like:
    //  <audio msaudiocategory="BackgroundCapableMedia" id="html5AudioObject_Single" preload="auto"
    //         src="https://ec-media.sndcdn.com/MgiAzfzbZTem.128.mp3?f10880d39085a94a0418a7ef69b03d522cd6dfee9399eeb9a52204996bfcbf3e406b666d8f1b16159ff5d4d7eaf1f0582e57fe612bbc041a4c6efdb4c40c8561892b87b591"></audio>

    for (var elemToCheckIdx in audioTagQ) {
        var elemToCheck = audioTagQ[elemToCheckIdx];
        elemToCheck.checked++;
        if (elemToCheck.elem.src.indexOf('sndcdn.com') > 0) {
            delete audioTagQ[elemToCheckIdx];
            onScAudioElement(elemToCheck.elem);
        } else if (elemToCheck.checked > 10) {
            // empty the q at some point
            delete audioTagQ[elemToCheckIdx];
        }
    }

    // TODO clear this interval when the q is empty and start it agains when a new element gets added
}, 250);

var maxDepth = 0;

function search(obj, cls) {
    for (var prop in obj) {
        var val = obj[prop];
        if (val instanceof cls) {
            return val;
        }
    }
    // not found. Look for it in the children
    for (var prop in obj) {
        var val = obj[prop];
        if (val && !val.__depth__) {
            val.__depth__ = 1; //(obj.__depth__ ? obj.__depth__ : 0) + 1;
            if (val.__depth__) {
                maxDepth = Math.max(maxDepth, val.__depth__);
                var res = search(val, cls);
                if (res) return res;
            }
        }
    }

    return null;
}

// stream track id 293
SC.stream('/tracks/149918430').then(function(player){
  player.play();
});

var AudioCtx = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioCtx();
var analyser = audioCtx.createAnalyser();

function onScAudioElement(scElem) {
    scElem.muted = true; // so annouying
    console.log('autodiscovered sc audio element', scElem);

    var source = audioCtx.createMediaElementSource(scElem);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    var dataArray = new Uint8Array(bufferLength);

    //canvasCtx = document.getElementById('canvas').getContext('2d');
    var canvas = audioVizBmd.canvas;
    var canvasCtx = audioVizBmd.context;
    var WIDTH = canvas.width, HEIGHT = canvas.height;

    var start = -Infinity;
    function draw(timestamp) {
      requestAnimationFrame(draw);
      audioVizBmd.dirty = true;

      // console.log(timestamp, start);
      if ((timestamp - start) < 100) return;
      start = timestamp;
      analyser.getByteTimeDomainData(dataArray);

      // canvasCtx.fillStyle = 'rgba(200, 200, 200, 0)';
      // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };
    requestAnimationFrame(draw);
}
