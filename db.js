const W3CWebSocket = require('websocket').w3cwebsocket;

const client = new W3CWebSocket('ws://localhost:5000/echo', 'echo-protocol');

const { json } = require('body-parser');
const {readFile, writeFile} = require("fs/promises")

const path = require("path");
const { default: Surreal } = require('surrealdb.js');

const db = new Surreal("http://127.0.0.1:8000/rpc")

client.onerror = function() {
    console.log('Connection Error');
};

client.onopen = function() {
    console.log('WebSocket Client Connected');

    
    client.send(JSON.stringify({id:"3fbc3c92-b6af-468e-b9b6-5659bcc9795e", request:"auth"}))
};


client.onclose = function() {
    console.log('echo-protocol Client Closed');
};

client.onmessage = async function(e) {
    if (typeof e.data === 'string') {
        const {message, request, id} = JSON.parse(e.data)

        if(request === "query"){


            await db.signin({
                user: 'root',
                pass: 'root',
            });

            await db.use("test", "test");

            try {
                let result = await db.query(message)

                client.send(JSON.stringify(
                    {clientID:id, message:JSON.stringify(result), request:"queryresult"}
                ))
            } catch {
                client.send(JSON.stringify(
                    {clientID:id, message:"error", request:"queryresult"}
                ))
            }
            
        }
    }
};