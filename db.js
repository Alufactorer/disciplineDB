const W3CWebSocket = require('websocket').w3cwebsocket;

const client = new W3CWebSocket('ws://localhost:5000/echo', 'echo-protocol');

const {readFile, writeFile} = require("fs/promises")

const path = require("path")

client.onerror = function() {
    console.log('Connection Error');
};

client.onopen = function() {
    console.log('WebSocket Client Connected');

    
    client.send(JSON.stringify({id:"3fbc3c92-b6af-468e-b9b6-5659bcc9795e"}))
};


client.onclose = function() {
    console.log('echo-protocol Client Closed');
};

client.onmessage = async function(e) {
    if (typeof e.data === 'string') {
        const {message, request, id} = JSON.parse(e.data)


        if(request === "send"){
            console.log(message);
            await writeFile(path.join(__dirname, "chat.txt"), message, "utf-8")
            client.send(JSON.stringify(
                {message:message, request: "sendtoclient", clientID:id}
            ))
        }
        if(request === "get"){
            console.log("get")
            let chat = await readFile(path.join(__dirname, "chat.txt"), "utf-8")
            client.send(JSON.stringify(
                {message:chat, request: "sendchat", clientID:id}
            ))
        }
    }
};