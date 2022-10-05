//websocket
const WebSocket = require("ws");


//rooms in memory
const {writeFile, readFile, mkdir} = require("fs/promises");

const {join} = require("path")


//ids
const {v4:uuidv4} = require("uuid");
const { write } = require("fs");




class disciplinedServer{
    constructor(path, port, events){
        this.id = `${uuidv4()}.rooms.json`
        this.socket = new WebSocket.Server({path, port})





        {writeFile(__dirname + "/rooms/" + this.id, JSON.stringify({}), "utf-8");}
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

    newRoom({name, update}){
        const rooms = JSON.parse(
            readFile(join(__dirname, "rooms", this.id))
        )
        this.socket.on("connection", ws => {
            update(ws);
        })
    }
}


const db = new disciplinedServer("/echo", 8080)
    .onconnect((ws) => {console.log("hello")})
    .onclose(ws => console.log("goodbye"))