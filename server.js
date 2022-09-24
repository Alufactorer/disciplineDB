const express = require("express");
const app = express();

const path = require("path");

const PORT = 5000

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "assets", "_api.jpg"));
});

app.listen(process.env.PORT || PORT, () => {
    console.log("app runs!")
})