import { Injectable } from '@angular/core';
import { APP_DI_CONFIG as config } from './app-config/app-config.constants';

let cameraMode = "user";
let inBoundTimestampPrev = 0;
let inBoundBytesPrev = 0;
let outBoundTimestampPrev = 0;
let outBoundBytesPrev = 0;
let existingTracks = [];

/*
    Generate a unique ID for the peer
*/
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var socket, localStream, connection, clientId = uuidv4(), channel;

const configuration = {
  iceServers: [
    {
      urls: 'stun:' + config.TURN_SERVER_IP_ADDRESS + ':' + config.TURN_SERVER_PORT
    },
    {
      urls: 'turn:' + config.TURN_SERVER_IP_ADDRESS + ':' + config.TURN_SERVER_PORT,
      username: config.TURN_SERVER_USERNAME,
      credential: config.TURN_SERVER_PASSWORD
    }
  ]
}

@Injectable({
  providedIn: 'root',
})
// @ts-ignore
export class ConnectionService {

  // constructor(@Inject( APP_CONFIG ) private config: IAppConfig) {}

  /*
      This function creates the socket connection and WebRTC connection.
      This is also responsible for changing media tracks when user switches mobile cameras (Front and back)
  */
  private initiatSocketAndPeerConnection(stream){
    // @ts-ignore
    let videoEL = document.getElementById("localVideo").srcObject = stream;

    if (typeof socket === 'undefined') {
      this.connectToWebSocket();
    } else {
        existingTracks.forEach(function (existingTrack, index) {
            existingTrack.replaceTrack(localStream.getTracks()[index]);
        });
    }
  }

  public disableAllButtons(){
    // @ts-ignore
    document.getElementById("sendOfferButton").disabled = true;
    // @ts-ignore
    document.getElementById("answerButton").disabled = true;
    // @ts-ignore
    document.getElementById("sendMessageButton").disabled = true;
    // @ts-ignore
    document.getElementById("hangUpButton").disabled = true;
  }

  /*
      Connect to the web socket and handle recieved messages from web sockets
  */
 private connectToWebSocket() {
    socket = new WebSocket(config.WEB_SOCKET_CONENCTION);

    // Create WebRTC connection only if the socket connection is successful.
    socket.onopen = (event) => {
      this.log('WebSocket Connection Open.');
      this.createRTCPeerConnection();
    };

    // Handle messages recieved in socket
    socket.onmessage = (event) => {
      let jsonData = JSON.parse(event.data);

      switch (jsonData.type) {
        case 'candidate':
          this.handleCandidate(jsonData.data, jsonData.id);
          break;
        case 'offer':
          this.handleOffer(jsonData.data, jsonData.id);
          break;
        case 'answer':
          this.handleAnswer(jsonData.data, jsonData.id);
          break;
        default:
          break;
      }
    };

    socket.onerror = (event) => {
      console.error(event);
      this.log('WebSocket Connection Error. Make sure web socket URL is correct and web socket server is up and running at - ' + config.WEB_SOCKET_CONENCTION);
    };

    socket.onclose = (event) => {
      this.log('WebSocket Connection Closed. Please Reload the page.');
      // @ts-ignore
      document.getElementById("sendOfferButton").disabled = true;
      // @ts-ignore
      document.getElementById("answerButton").disabled = true;
    };
  }

  private log(message) {
    // @ts-ignore
    document.getElementById("logs").value += message + '\n';
  }

  /*
      This is responsible for creating an RTCPeerConnection and handle it's events.
  */
  private createRTCPeerConnection(){
    this.pushStats();
    connection = new RTCPeerConnection(configuration);

    // Add both video and audio tracks to the connection
    for (const track of localStream.getTracks()) {
      this.log("Sending Stream.")
      existingTracks.push(connection.addTrack(track, localStream));
    }

    // This event handles displaying remote video and audio feed from the other peer
    connection.ontrack = event => {
      this.log("Recieved Stream.");
      // @ts-ignore
      document.getElementById("remoteVideo").srcObject = event.streams[0];
    }

    // This event handles the received data channel from the other peer
    connection.ondatachannel = (event) => {
      this.log("Recieved a DataChannel.")
      channel = event.channel;
      this.setChannelEvents(channel);
      // @ts-ignore
      document.getElementById("sendMessageButton").disabled = false;
    };

    // This event sends the ice candidates generated from Stun or Turn server to the Receiver over web socket
    connection.onicecandidate = event => {
      if (event.candidate) {
        this.log("Sending Ice Candidate - " + event.candidate.candidate);

        socket.send(JSON.stringify(
          {
            action: 'onMessage',
            type: 'candidate',
            data: event.candidate,
            id: clientId
          }
        ));
      }
    }

    // This event logs messages and handles button state according to WebRTC connection state changes
    connection.onconnectionstatechange = (event) => {
      switch(connection.connectionState) {
        case "connected":
          this.log("Web RTC Peer Connection Connected.");
          // @ts-ignore
          document.getElementById("answerButton").disabled = true;
          // @ts-ignore
          document.getElementById("sendOfferButton").disabled = true;
          // @ts-ignore
          document.getElementById("hangUpButton").disabled = false;
          // @ts-ignore
          document.getElementById("sendMessageButton").disabled = false;
          break;
        case "disconnected":
          this.log("Web RTC Peer Connection Disconnected. Please reload the page to reconnect.");
          this.disableAllButtons();
          break;
        case "failed":
          this.log("Web RTC Peer Connection Failed. Please reload the page to reconnect.");
          console.log(event);
          this.disableAllButtons();
          break;
        case "closed":
          this.log("Web RTC Peer Connection Failed. Please reload the page to reconnect.");
          this.disableAllButtons();
          break;
        default:
          break;
      }
    }

    this.log("Web RTC Peer Connection Created.");
    // @ts-ignore
    document.getElementById("sendOfferButton").disabled = false;
  }

  /*
      Creates and sends the Offer to the Receiver
      Creates a Data channel for exchanging text messages
      This function is invoked by the Caller
  */


  /*
      Accepts ICE candidates received from the Caller
  */
 private handleCandidate(candidate, id) {

    // Avoid accepting the ice candidate if this is a message created by the current peer
    if (clientId != id) {
      this.log("Adding Ice Candidate - " + candidate.candidate);
      connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /*
      Accepts Offer received from the Caller
  */
 private handleOffer(offer, id) {

    // Avoid accepting the Offer if this is a message created by the current peer
    if (clientId != id) {
      this.log("Recieved The Offer.");
      connection.setRemoteDescription(new RTCSessionDescription(offer));
      // @ts-ignore
      document.getElementById("answerButton").disabled = false;
      // @ts-ignore
      document.getElementById("sendOfferButton").disabled = true;
    }
  }

  /*
      Accetps Answer received from the Receiver
  */
 private handleAnswer(answer, id) {

    // Avoid accepting the Answer if this is a message created by the current peer
    if(clientId != id){
      this.log("Recieved The Answer");
      connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /*
      Handle Data Channel events
  */
 private setChannelEvents(channel) {
    channel.onmessage = (event) => {
      var data = JSON.parse(event.data);
      // @ts-ignore
      document.getElementById("chatTextArea").value += data.message + '\n';
    };

    channel.onerror = (event) => {
      this.log('DataChannel Error.');
      console.error(event)
    };

    channel.onclose = (event) => {
      this.log('DataChannel Closed.');
      this.disableAllButtons();
    };
  }

  private pushStats() {
    let inBoundStatsDiv = document.getElementById("inBoundstats");
    let outBoundstatsDiv = document.getElementById("outBoundstats");

    window.setInterval(() => {
      connection.getStats(null).then(stats => {
        let inBoundBitrate;
        let outBoundBitrate;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            let now = report.timestamp;
            let bytes = report.bytesReceived;
            if (inBoundTimestampPrev) {
                inBoundBitrate = 0.125 * (8 * (bytes - inBoundBytesPrev) / (now - inBoundTimestampPrev));
                inBoundBitrate = Math.floor(inBoundBitrate);
            }
            inBoundBytesPrev = bytes;
            inBoundTimestampPrev = now;
          }
          else if(report.type === 'outbound-rtp' && report.mediaType === 'video'){
            let now = report.timestamp;
            let bytes = report.bytesSent;
            if (outBoundTimestampPrev) {
                outBoundBitrate = 0.125 * (8 * (bytes - outBoundBytesPrev) / (now - outBoundTimestampPrev));
                outBoundBitrate = Math.floor(outBoundBitrate);
            }
            outBoundBytesPrev = bytes;
            outBoundTimestampPrev = now;
          }

          if(isNaN(inBoundBitrate)){
            inBoundBitrate = 0;
          }

          if(isNaN(outBoundBitrate)){
            outBoundBitrate = 0;
          }

          // @ts-ignore
          let inboundVideoWidth = document.getElementById("remoteVideo").videoWidth;
          // @ts-ignore
          let inboundVideoHeight = document.getElementById("remoteVideo").videoHeight;
          inBoundStatsDiv.innerHTML = `<strong>Bitrate: </strong>${inBoundBitrate} KB/sec<br/><strong>Video dimensions: </strong> ${inboundVideoWidth}x${inboundVideoHeight}px<br/>`;

          // @ts-ignore
          let outboundVideoWidth = document.getElementById("localVideo").videoWidth;
          // @ts-ignore
          let outboundVideoHeight = document.getElementById("localVideo").videoHeight;
          // @ts-ignore
          outBoundstatsDiv.innerHTML = `<strong>Bitrate: </strong>${outBoundBitrate} KB/sec<br/><strong>Video dimensions: </strong> ${outboundVideoWidth}x${outboundVideoHeight}px<br/>`;
        });

      });
    }, 1000);
  }

  public createAndSendOffer() {
    if (channel) {
        channel.close();
    }

    // Create Data channel
    channel = connection.createDataChannel('channel', {});
    this.setChannelEvents(channel);

    // Create Offer
    connection.createOffer().then(
      offer => {
        this.log('Sent The Offer.');

        // Send Offer to other peer
        socket.send(JSON.stringify(
          {
            action: 'onMessage',
            type: 'offer',
            data: offer,
            id: clientId
          }
        ));

        // Set Offer for negotiation
        connection.setLocalDescription(offer);
      },
      error => {
        this.log('Error when creating an offer.');
        console.error(error);
      }
    );
  }

  /*
      Creates and sends the Answer to the Caller
      This function is invoked by the Receiver
  */
  public createAndSendAnswer() {

    // Create Answer
    connection.createAnswer().then(
      answer => {
        this.log('Sent The Answer.');

        // Set Answer for negotiation
        connection.setLocalDescription(answer);

        // Send Answer to other peer
        socket.send(JSON.stringify(
          {
            action: 'onMessage',
            type: 'answer',
            data: answer,
            id: clientId
          }
        ));
      },
      error => {
        this.log('Error when creating an answer.');
        console.error(error);
      }
    );
  }

  /*
      Send messages via Data Channel
  */
  public sendMessage() {
    // @ts-ignore
    var messageText = document.getElementById("messageInput").value;

    channel.send(JSON.stringify({
        "message": messageText
    }));

    // @ts-ignore
    document.getElementById("chatTextArea").value += messageText + '\n';
  }

  public disconnectRTCPeerConnection() {
    connection.close();
  }

  /*
      Switch between front and back camera when opened in a mobile browser
  */
  public switchMobileCamera(){
    if (cameraMode == "user") {
      cameraMode = "environment";
    } else {
      cameraMode = "user";
    }

    this.getLocalWebCamFeed();
  }

  /*
      Get local camera permission from user and initiate socket and WebRTC connection
  */
  public getLocalWebCamFeed(){

    // width: { ideal: 4096 },
    // height: { ideal: 2160 }

    let constraints = {
      audio: true,
      video: {
        facingMode: cameraMode,
        width: { ideal: 4096 },
        height: { ideal: 2160 }
      }
    }

    // @ts-ignore
    navigator.getWebcam = (navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        localStream = stream;
        this.initiatSocketAndPeerConnection(stream);
      })
      .catch((e) =>  { this.log(e.name + ": " + e.message); });
    }
    else {
      // @ts-ignore
      navigator.getWebcam({ audio: true, video: true },
        (stream) => {
          localStream = stream;
          this.initiatSocketAndPeerConnection(stream);
        },
        () => { this.log("Web cam is not accessible.");
      });
    }
  }
}
