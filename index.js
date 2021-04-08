const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const {YouTubeLiveChat}  = require('./YTLICH.js');
const googleTTS = require('google-tts-api'); // CommonJS

const PORT = process.env.PORT || 8080;
const INDEX = '/index.html';

const port = process.env.PORT || 8080
const app = express()
const httpServer = http.createServer(app)

app.use(express.static(__dirname));

app.use("/", (req, res) => res.sendFile(INDEX, { root: __dirname }));


const wss = new WebSocket.Server({
    'server': httpServer
})

httpServer.listen(port);

function noop() {}

function heartbeat() {
  this.isAlive = true;

}
//http://localhost:8080/?CHID=UCggHHzddjVYUwb4Uc4bO_cg&APIKEY=AIzaSyDJ42V4HKYRMJKQhtbclC_Stxsmnj9sCD8



wss.on('connection', async function  connection(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', async function incoming(message) {
    let data = JSON.parse(message);
    const handler = new YouTubeLiveChat(data.APIKEY);
    const currentLiveStreams = await handler.searchChannelForLiveVideoIds(data.CHID);

    if(!currentLiveStreams.length)
      return console.log(`${message} no Live broadcast`),ws.send('noBroadcast');
    console.log(`${data.CHID} started`);
    const videoId = currentLiveStreams[0];
    const liveChatId = await handler.getLiveChatIdFromVideoId(videoId);

    const interval = setInterval(function ping() {

        if (ws.isAlive === false) return ws.terminate(),clearInterval(interval);

        ws.isAlive = false;
        ws.ping(noop);
        //console.log('pong')
    }, 10000);

    handler.listen(liveChatId).subscribe( async (chatMessage) => {
      if(!ws.isAlive)
        return console.log(`${data.CHID} stopped`), handler.stop(liveChatId),  delete handler;

      if (chatMessage.snippet.type === 'textMessageEvent') {

        let msg = `${chatMessage.authorDetails.displayName}: ${chatMessage.snippet.displayMessage}`;
      //
        let voice = await googleTTS.getAudioBase64(msg<200?msg:msg.substring(0, 200), {
            lang: 'ru',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 30000,
          })
          ws.send(voice);
      }
    });

  });
  if (ws.readyState === WebSocket.OPEN) {

  }

});



wss.on('close', function close() {
  clearInterval(interval);
});
