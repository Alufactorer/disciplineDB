const express = require("express");
const app = express();
const enablews = require("express-ws")

const path = require("path");

const PORT = 5000

const dbkey = "3fbc3c92-b6af-468e-b9b6-5659bcc9795e"
let dbconnection;

enablews(app)


app.use(express.json())
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "assets", "_api.jpg"));
});

app.ws("/echo", (ws, req) => {
    ws.on("message", msg => {
        let user = (JSON.parse(msg))

        if(user.id === dbkey){
            dbconnection = ws
        }
        console.log(id)
        ws.send(JSON.stringify(id));
    })
})

app.listen(process.env.PORT || PORT, () => {
    console.log("app runs!")
})

