const { disciplinedSocket } = require("./models");


const db = new disciplinedSocket("http://localhost:8080/echo", "hello")