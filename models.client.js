const { disciplinedClient } = require("./models");


const client = new disciplinedClient("http://localhost:8080/echo")
    .onconnect(obj => {
        obj.connection.send(JSON.stringify({request:"connecttoroom", content:{id:obj.id, roomid:"hello there"}}))
    })