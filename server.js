const { json } = require("body-parser");
const express = require("express");
const app = express();
const enablews = require("express-ws")

const path = require("path");

const { v4: uuidv4 } = require('uuid');

const {readFile, writeFile} = require("fs/promises")

require("dotenv").config()

const PORT = 5000

let clients = [];

const dbkey = process.env.DBKEY;

console.log(dbkey)


let dbclient = null;

enablews(app)


app.use(express.json())
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "assets", "_api.jpg"));
});

app.ws("/echo", (ws, req) => {

    let internalid = uuidv4()




    ws.on("close", () => {

        if(ws === dbclient){
            ws = null;
        } else {

            const specificinternal = clients.filter(val => val.ws === ws)[0]
            clients.splice(clients.indexOf(clients.filter(val => val.ws === ws)), 1)

            if(specificinternal.roomID){dbclient.send(JSON.stringify({
                request:"disconnectroom", 
                id:specificinternal.id, 
                roomID : specificinternal.roomID
            }))}
        }

        
    })

    ws.on("message", msg => {
        const {request, id, message, clientID, roomID, roomClients} = (JSON.parse(msg))



        if(id === dbkey && request === "auth"){
            dbclient = ws

        } if(request === "auth" && id !== dbkey ) {
            
            clients.push({ws, id:internalid})

        }

        
        
        if(request === "query"){
            dbclient.send(JSON.stringify(
                {request, id:internalid, message}
            ))
        }

        

        if(request === "room"){
            if(roomID){
                //connect to room
                dbclient.send(JSON.stringify({
                    message, request:"connectroom", id:internalid, roomID
                }))
            } else {
                //create new room
                dbclient.send(JSON.stringify({
                    message, request:"createroom", id:internalid
                }))
            }
        }

        if(request === "roomsend"){
            const specificinternal = clients.filter(val => val.ws === ws)[0]
            if(specificinternal.roomID){
                dbclient.send(JSON.stringify({
                    request, 
                    roomID:specificinternal.roomID, 
                    message
                }))
            } else {
                ws.send("no such room")
            }
        }

        //from database server

        if(request === "roomconnected"){
            const {ws, id} = clients.filter(val => val.id === clientID)[0]


            clients.splice(clients.indexOf(clients.filter(val => val.id === clientID)), 1, {ws, id, roomID})

        }

        if(request === "queryresult"){

            clients.filter(val => val.id === clientID)[0].ws.send(JSON.stringify({
                message, request
            }))


        }

        if(request === "sendtoclient"){


            roomClients.forEach(clientid => {
                clients.filter(val => val.id === clientid)[0].ws.send((JSON.stringify({
                    message
                })))
            })
        }

        if(request === "error"){
            clients.filter(val => val.id === clientID)[0].ws.send(JSON.stringify({
                message, request
            }))
        }
    })
})

app.listen(process.env.PORT || PORT, () => {
    console.log("app runs!")
})

