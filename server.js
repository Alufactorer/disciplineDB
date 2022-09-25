const express = require("express");
const app = express();
const enablews = require("express-ws")

const path = require("path");

const { v4: uuidv4 } = require('uuid');



const PORT = 5000

let clients = [];

enablews(app)


app.use(express.json())
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "assets", "_api.jpg"));
});

app.ws("/echo", (ws, req) => {

    clients.push({ws, id:""})

    console.log(clients.length)

    ws.on("close", () => {
        clients.splice(clients.indexOf(clients.filter(val => val.ws === ws)), 1)
    })

    ws.on("message", msg => {
        const {request, id, message, clientID} = (JSON.parse(msg))

        let internalid;

        if(id){
            (clients.filter(val => val.ws === ws))[0].id = id
            internalid = id
        } if(!id && !clientID) {
            internalid = uuidv4()
            (clients.filter(val => val.ws === ws))[0].id = internalid;
        }



        if(request === "send"){
            clients.filter(val => val.id === "3fbc3c92-b6af-468e-b9b6-5659bcc9795e")[0].ws.send(JSON.stringify(
                {request, message, id:internalid}
            ))
        }

        if(request === "get"){
            clients.filter(val => val.id === "3fbc3c92-b6af-468e-b9b6-5659bcc9795e")[0].ws.send(JSON.stringify(
                {request, id:internalid}
            ))
        }

        if(request === "sendtoclient"){
            clients.filter(val => val.id === clientID)[0].ws.send(JSON.stringify({
                message
            }))
        }

        if(request === "sendchat"){
            clients.filter(val => val.id === clientID)[0].ws.send(JSON.stringify({
                message
            }))
        }
        
    })
})

app.listen(process.env.PORT || PORT, () => {
    console.log("app runs!")
})

