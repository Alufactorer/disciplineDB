const express = require("express");
const app = express();
const enablews = require("express-ws")

const path = require("path");

const { v4: uuidv4 } = require('uuid');



const PORT = 5000

let clients = [];

const dbkey = process.env.DBKEY;


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
            clients.splice(clients.indexOf(clients.filter(val => val.ws === ws)), 1)
        }

        
        console.log("connection severed", clients.length)
    })

    ws.on("message", msg => {
        const {request, id, message, clientID} = (JSON.parse(msg))



        if(id === dbkey && request === "auth"){
            console.log("db client")
            dbclient = ws

        } if(request === "auth" && id !== dbkey ) {
            
            clients.push({ws, id:internalid})
            console.log("new connection", clients.length)
        }

        
        
        if(request === "query"){


            dbclient.send(JSON.stringify(
                {request, id:internalid, message}
            ))
        }

        if(request === "queryresult"){
            console.log(message, clientID)

            clients.filter(val => val.id === clientID)[0].ws.send(JSON.stringify({
                message, request
            }))
        }
    })
})

app.listen(process.env.PORT || PORT, () => {
    console.log("app runs!")
})

