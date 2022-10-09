//websocket
const WebSocket = require("ws");
const client = (require("websocket").w3cwebsocket)


//rooms in memory
const {writeFile, readFile, mkdir, readdir} = require("fs/promises");

const {join} = require("path")


//ids
const {v4:uuidv4} = require("uuid");
const { write } = require("fs");
const { urlToHttpOptions } = require("url");
const { request } = require("express");
require("dotenv").config();




class disciplinedServer{
    constructor(path, port, alloweddbclients){
        this.socket = new WebSocket.Server({path, port})

        this.alloweddbclients = alloweddbclients ||  [];
        this.dbclient = false;
        this.clients = [];

        
        this.socket.on("connection", ws => {


            ws.on("message", msg => {
                const {request, content} = JSON.parse(msg.toString());

                if(request === "broadcast"){
                    
                    this.clients.forEach(client => client.ws.send(JSON.stringify({request, content})))
                    
                }

                if(request === "dbclient"){
                    if(!this.dbclient && this.alloweddbclients.includes(content.dbclientid)){
                        this.dbclient = ws
                    }
                }
                if(request === "clientauth"){
                    this.clients.push({ws, id:content.clientid})
                }

                if(request === "connecttoroom"){
                    this.dbclient.send(JSON.stringify({
                        request:"connecttoroom",
                        content
                    }))
                }
            })

            ws.on("close", l => {

                if(this.dbclient === ws){
                    this.dbclient = false
                } else {
                    this.clients.splice(this.clients.map(client => client.ws).indexOf(ws), 1)
                }

            })
        })

        return this
    }

    onconnect(updatefunction){
        this.socket.on("connection", ws => {
            updatefunction(ws)
        })

        return this
    }

    onclose(closefunction){
        this.socket.on("connection", ws => {
            ws.on("close", ws => closefunction(ws))
        })

        return this
    }

    ondbconnection(dbconnectionfunction){
        this.socket.on("connection", ws => {
            ws.on("message", async message => {
                const {request, content} = JSON.parse(message.toString())

                if(request === "dbclient"){
                    dbconnectionfunction(this)
                }
            })
        })

        return this
    }

    onclientconnect(clientconnectionfunction){
        this.socket.on("connection", ws => {
            ws.on("message", async message => {
                const {request, content} = JSON.parse(message.toString())

                if(request === "clientauth"){
                    clientconnectionfunction(this)
                }


            })
        })

        return this
    }
}

class disciplinedSocket{
    constructor(url, id){
        this.id = `${id || uuidv4()}.rooms.json`
        this.connection = new client(url, "echo-protocol")


        this.roomconnectfunctions = [];

        mkdir(join(__dirname, "rooms")).then(
            res => writeFile(__dirname + "/rooms/" + this.id, JSON.stringify({}, " "), "utf-8"))
        .catch(
            res => writeFile(__dirname + "/rooms/" + this.id, JSON.stringify({}, " "), "utf-8")
        )

        this.connection.onopen = async () => {

            const content = {
                dbclientid:this.id.split(".rooms.json")[0]
            }

            this.connection.send(JSON.stringify({request:"dbclient", content}))
        };

        this.connection.onmessage = async msg => {
            const {request, content} = JSON.parse(msg.data);

            console.log("hello")

            if(request === "connecttoroom"){
                const allrooms = JSON.parse(await readFile(join(__dirname, "rooms", this.id), "utf-8"))

                console.log(allrooms)


                if(allrooms[content.roomid]){
                    if(!allrooms[content.roomid].includes(content.id)){
                        allrooms[content.roomid].push(content.id)
                    }
                } else {
                    allrooms[content.roomid] = [];
                    allrooms[content.roomid].push(content.id)
                }

                await writeFile(join(__dirname, "rooms", this.id), JSON.stringify(allrooms, " "), "utf-8")
                

                this.roomconnectfunctions.forEach(f => f(content, this))
            }


            
        }


        
    }

    onroomconnect(listener){
        this.roomconnectfunctions.push(listener)
    }

    onconnect(connectionfunction){
        this.connection.onopen = async () => {
            connectionfunction(this);
        };

        return this
    }
    onclose(closefunction){

        //make this work for 


        this.connection.onclose = closefunction;

        return this
    }
    
    
}


class disciplinedClient{
    constructor(url, id){
        this.connection = new client(url, "echo-protocol");
        this.id = `${id || uuidv4()}`
        this.connection.onopen = async () => {

            const content = {
                clientid:this.id
            }

            this.connection.send(JSON.stringify({request:"clientauth", content}))
        };
    }

    onconnect(connectionfunction){
        this.connection.onopen = async () => {
            connectionfunction(this);
        };

        return this
    }
    onclose(closefunction){
        this.connection.onclose = async () => closefunction(this);

        return this
    }


    connecttoroom(roomid){
        this.connection.send(JSON.stringify(
            {request:"connecttoroom", content:{id: this.id, roomid}}
        ))

        return this
    }

    addroomlistener(roomlistener){
        this.connection.onmessage = (msg => {
            roomlistener(JSON.parse(msg))
        })

        return this
    }


    broadcast(content){
        this.connection.send(JSON.stringify({content, request:"broadcast"}))

        return this
    }

    onbroadcast(listener){
        this.connection.onmessage = async msg => {
            listener(JSON.parse(msg.data))
        }

        return this
    }
}





module.exports = {
    disciplinedSocket, disciplinedServer, disciplinedClient
}