const { disciplinedServer } = require("./models");
require("dotenv").config()


const server = new disciplinedServer("/echo", 8080, process.env.dbkeys.split(" "), process.env.DBKEYS)