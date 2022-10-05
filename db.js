const W3CWebSocket = require('websocket').w3cwebsocket;

const client = new W3CWebSocket('ws://localhost:5000/echo', 'echo-protocol');

const { json } = require('body-parser');
const { write } = require('fs');
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
        const {message, request, id, roomID} = JSON.parse(e.data)

        

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

        if(request === "roomsend"){
            const room = JSON.parse(await readFile(path.join(__dirname, "rooms.json"), "utf-8"))[roomID];

            client.send(JSON.stringify({
                roomClients:room, 
                request:"sendtoclient",
                message 
            }))
        }

        if(request === "connectroom"){

            const allRooms = JSON.parse(await readFile(path.join(__dirname, "rooms.json"), "utf-8"));

            //verify if user has permission to edit file, something on the lines like:
            /* 
                let permittedusers = await db.query("SELECT todo:projectid.users FROM todo");
                if(permittedusers.includes({(userid || useremail ) && userpassword}))
            */

            if(allRooms[roomID]) {
                allRooms[roomID].includes(id) ? "" : allRooms[roomID].push(id)

                await writeFile(path.join(__dirname, "rooms.json"), JSON.stringify(allRooms, null, " "), "utf-8")

            
                client.send(JSON.stringify({
                    request:"roomconnected",
                    roomID : roomID, 
                    clientID:id
                }))
            } else {
                client.send(JSON.stringify({
                    request:"error", 
                    message:"no such room", 
                    clientID:id
                }))
            }


            
        }

        if(request === "disconnectroom"){
            const allRooms = JSON.parse(await readFile(path.join(__dirname, "rooms.json"), "utf-8"));

            if(allRooms[roomID].includes(id)){
                allRooms[roomID].splice(allRooms[roomID].indexOf(id), 1)

                await writeFile(path.join(__dirname, "rooms.json"), JSON.stringify(allRooms, null, " "), "utf-8")
            } 
        }
    }
};