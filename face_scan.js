const video = document.getElementById("video");
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const emoticon = document.getElementById("emoticon");
    const emoticonBar = document.getElementById("emoticonBar");
    const message = document.getElementById('message');
    const MODEL_URL = "models/";
    let consolelength = 0;

    let streamingSrc = null;
    
    console.log("document.body.clientWidth:" + document.body.clientWidth + ";emotion.width:" + emoticon.clientWidth + ";" + emoticonBar.style.right);
    console.log("document.body.clientHeight:" + document.body.clientHeight + ";messagse.clientHeight:" + message.clientHeight);

    let canvasW = document.body.clientWidth - (emoticon.clientWidth + emoticonBar.style.right) - 100;
    let canvasH = document.body.clientHeight - message.clientHeight - 10;
    console.log(canvasW + ":" + canvasH);
    // if (canvasW >= 640) {
    //   canvasW = 640;
    // }
    // if (canvasH >= 480) {
    //   canvasH = 480;
    // }
    const emoticonTxt = [':)',':|'];

		const init = async () => {
      console.log("init");

      videoStart();

      // (1)モデル読み込み　※モデルの情報のフォルダを指定
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      //顔の表情の分類のモデルのロード
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      //オブジェクト検出モデルのロード
      await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
      //ランドマーク検出モデルのロード
      await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
      await faceapi.loadFaceLandmarkModel(MODEL_URL);
      //顔認識モデルのロード
      await faceapi.loadFaceRecognitionModel(MODEL_URL);
    }

    //Videoスタート
    const videoStart = async() => {
      if (streamingSrc !== null) {
        streamingSrc.getVideoTracks().forEach(element => {
          element.stop();
        });
      }

      canvasW = document.body.clientWidth - (emoticon.clientWidth + emoticonBar.style.right) - 100;
      canvasH = document.body.clientHeight - message.clientHeight - 10;

      let videoH = canvasH;
      let videoW = canvasW;
      if(navigator.userAgent.match(/(iPhone|iPad|iPod|Android)/i)){
        //スマホ・タブレットかどうか
        videoH = canvasW;
        videoW = canvasH;
      }

		  // Webカメラ初期化
		  const stream = await navigator.mediaDevices.getUserMedia({
        	  audio: false,
        	  video: {
          	  width: videoW,
          	  height: videoH,
              facingMode:'user'
        	  }
      });

      try {
        video.srcObject = stream;
        streamingSrc = stream;
      } catch (err) {
        video.src = window.URL.createObjectURL(stream);
      }

      canvas.width = canvasW;
      canvas.height = canvasH;
      emoticonBar.style.height = videoH;
      console.log("emoticonBar.clientHeight" + emoticonBar.clientHeight);
    }

    const onPlay = () => {
      console.log("onPlay");
      const inputSize = 512; // 認識対象のサイズ
      const scoreThreshold = 0.5; // 数値が高いほど精度が高くなる（～0.9）
      // (2)オプション設定
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize,
        scoreThreshold
      });
      
      const detectInterval = setInterval(async () => {
        // (3)顔認識処理
        const result = await faceapi.detectSingleFace(
          video,
          options
        );

        if (result) {
          //message.textContent = "顔認識されてます";
          //キャンバスクリア
          canvas.getContext('2d').clearRect(0, 0, canvasW, canvasH);
          checkFace();
        } else {
          //message.textContent = "顔認識されていません";
        }
    	
      }, 300);
    }
    
    //
    checkFace = async () => {
      //認識処理
    	let faceData = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions()
      ).withFaceExpressions();

      //取得した結果チェック
      if (faceData.length) {
        if (consolelength != faceData.length) {
          console.log("faceData.length:" + faceData.length);
          consolelength = faceData.length;
        }
        const setDetection = () => {
          let det = faceData[0].detection;
          let box = det.box;
          let x = box.x,
              y = box.y,
              w = box.width,
              h = box.height;

          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.strokeStyle = '#76FF03'; //明るい緑
          ctx.lineWidth = 4;
          ctx.stroke();
        };
        const setExpressions = () => {
          //笑顔認識
          let happy = faceData[0].expressions.happy,
              color = happy * 150 + 100;
          //console.log("happy:" + happy);
          //console.log("color:" + color);
          emoticon.style.bottom = (canvasH - 40) * happy + 'px';
          emoticon.style.backgroundColor = `rgb(${color}, ${color}, 100)`;
          if(happy > 0.5){
            emoticon.innerHTML = emoticonTxt[0];
          }else{
            emoticon.innerHTML = emoticonTxt[1];
          }
        };

        //setDetection();
        setExpressions();
      }

      let faceData_landmarks = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();

      //認識結果のリサイズ
      const iSize = {width: canvasW, height:canvasH};
      const rData = await faceapi.resizeResults(faceData_landmarks, iSize);

      drawReslut(rData);
    }

    function drawReslut(data) {
      for (let i = 0; i < data.length; i++) {
        const det = data[i].detection;
        const marks = data[i].landmarks.positions;
        const box = det.box;

        ctx.fillStyle = "red";
	      ctx.strokeStyle = "red";
	      ctx.lineWidth = 4;
	      ctx.strokeRect(box.x, box.y, box.width, box.height);

        drawLandmarks(marks);
        drawNose(marks);
        drawGrasses(marks);
      }
    }

    //ランドマーク取得
    function drawLandmarks(marks) {
      for(let i=0; i<marks.length; i++){
        
        let x = marks.x;
        let y = marks.y;
        ctx.fillRect(x, y, 2, 2);
        ctx.fillText(i, x, y, 18);
      }
    };

    //鼻を書く
    function drawNose(marks) {
      ctx.strokeStyle = "black";
	    ctx.lineWidth = 2;
	    ctx.beginPath();

      for(let i=27; i<35; i++){
		    let fX = marks[i].x;
        let fY = marks[i].y;
        let tX = marks[i+1].x;
        let tY = marks[i+1].y;
        ctx.moveTo(fX, fY);
        ctx.lineTo(tX, tY);
      }
      ctx.stroke();
    }

    //グラスを書く
    function drawGrasses(marks){
      ctx.strokeStyle = "black";
	    ctx.lineWidth = 2;
	    ctx.beginPath();
	    ctx.moveTo(marks[39].x, marks[39].y);
	    ctx.lineTo(marks[42].x, marks[42].y);
	    ctx.stroke();

      // 左
      const lX = (marks[39].x + marks[36].x)/2;
      const lY = (marks[41].y + marks[38].y)/2;
      const lR = (marks[39].x - marks[36].x);
      ctx.beginPath();
      ctx.arc(lX, lY, lR, 0, Math.PI*2);
      ctx.stroke();
      // 右
      const rX = (marks[45].x + marks[42].x)/2;
      const rY = (marks[46].y + marks[43].y)/2;
      const rR = (marks[45].x - marks[42].x);
      ctx.beginPath();
      ctx.arc(rX, rY, rR, 0, Math.PI*2);
      ctx.stroke();
    }

    let timeoutID = 0;
    let delay = 500;
    window.addEventListener("orientationchange", function() {
	    console.log("回転");
      
      clearTimeout(timeoutID);

      timeoutID = setTimeout(
        function() {
          location.reload();
        }, delay); 
    });

    
    window.addEventListener('resize', function(){
      console.log("Width:" + window.innerWidth);
      console.log("Height:" + window.innerHeight);

      clearTimeout(timeoutID);

      timeoutID = setTimeout(
        function() {
          location.reload();
        }, delay); 
    });