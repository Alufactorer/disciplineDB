//websocket
const WebSocket = require("ws");
const client = (require("websocket").w3cwebsocket)


//rooms in memory
const {writeFile, readFile, mkdir} = require("fs/promises");

const {join} = require("path")


//ids
const {v4:uuidv4} = require("uuid");
const { threadId } = require("worker_threads");




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

                if(request === "registerroomid"){
                    this.clients[(this.clients.map(client => client.id).indexOf(content.clientid))].roomid = content.roomid
                }


                if(request === "roommessagetoserver"){
                    const roomid = content.roomid
                    const senderid = content.senderid;
                    this.dbclient.send(JSON.stringify({request, content:{message:content.message, roomid, senderid}}))
                }
                if(request === "roommessagetoclient"){
                    //content of list form containing all clients in given room, ["id", "id", "id"]

                    console.log(content)

                    try{content.roomclients.forEach(client => {
                        this.clients[this.clients.map(c => c.id).indexOf(client)].ws.send(JSON.stringify({
                            request, content:content.message
                        }))
                    })}catch(e){console.log("the database seems to not be able to respond quicly enough")}
                }
            })

            ws.on("close", l => {
                if(this.dbclient === ws){
                    this.dbclient = false
                } else {
                    
                    if(this.clients[this.clients.map(client => client.ws).indexOf(ws)].roomid){
                    this.dbclient.send(JSON.stringify({request:"disconnectfromroom", content:{clientId:this.clients[this.clients.map(client => client.ws).indexOf(ws)].id, roomid:this.clients[this.clients.map(client => client.ws).indexOf(ws)].roomid}}))
                }
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
        this.roommessagefunction = false;


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

            if(request === "connecttoroom"){
                let allrooms = JSON.parse(await readFile(join(__dirname, "rooms", this.id), "utf-8"))


                if(allrooms[content.roomid]){
                    if(!allrooms[content.roomid].includes(content.id)){
                        allrooms[content.roomid].push(content.id)
                    }
                } else {
                    allrooms[content.roomid] = [];
                    allrooms[content.roomid].push(content.id)
                }

                await writeFile(join(__dirname, "rooms", this.id), JSON.stringify(allrooms, " "), "utf-8")

                
                
                this.connection.send(JSON.stringify({request:"registerroomid", content:{clientid:content.id, roomid:content.roomid}}))

                this.roomconnectfunctions.forEach(f => f(content, this))
            }

            if(request === "disconnectfromroom"){
                let allrooms = JSON.parse(await readFile(join(__dirname, "rooms", this.id), "utf-8"))


                allrooms[content.roomid].splice(allrooms[content.roomid].indexOf(content.clientid), 1)

                await writeFile(join(__dirname, "rooms", this.id), JSON.stringify(allrooms, " "), "utf-8")

            }

            if(request === "roommessagetoserver"){
                if(!this.roommessagefunction){
                    throw "no function provided to process incoming roommessages"
                }
                let roomclients = JSON.parse(await readFile(join(__dirname, "rooms", this.id)))[content.roomid];

                roomclients.splice(content.senderid, 1)


                let broadcastfunctionresult = this.roommessagefunction(content.message)

                this.connection.send(JSON.stringify({request:"roommessagetoclient", content:{roomclients, message:broadcastfunctionresult}}))
            }
            
        }


        
    }

    onroomconnect(listener){
        this.roomconnectfunctions.push(listener)

        return this
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
    
    onroommessage(roombroadcastmutation){
        this.roommessagefunction = roombroadcastmutation
    }
    
}


class disciplinedClient{
    constructor(url, id){
        this.currentconnectedroom = false;
        this.connection = new client(url, "echo-protocol");
        this.id = `${id || uuidv4()}`

        this.room = false;

        this.roomlisteners = [];
        this.connectionlisteners = [];

        this.connection.onopen = async () => {

            const content = {
                clientid:this.id
            }

            if(this.room){
                this.connection.send(JSON.stringify(
                    {request:"connecttoroom", content:{id: this.id, roomid:this.room}}
                ))
            }

            this.connection.send(JSON.stringify({request:"clientauth", content}))

            this.connectionlisteners.forEach(async l => await l(this))
        };

        this.connection.onmessage = async msg => {
            const {request, content} = JSON.parse(msg.data)

            if(request === "roommessagetoclient"){
                this.roomlisteners.forEach(l => l(content))
            }
        }
    }

    onconnect(connectionfunction){
        this.connectionlisteners.push(connectionfunction)

        return this
    }
    onclose(closefunction){
        this.connection.onclose = async () => closefunction(this);

        return this
    }


    connecttoroom(roomid){
        this.room = roomid

        return this
    }

    addroomlistener(roomlistener){
        this.roomlisteners.push(roomlistener)

        return this
    }


    roommessage(message){
        this.connection.send(JSON.stringify({request:"roommessagetoserver", content:{message, roomid:this.room, senderid:this.id}}))
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