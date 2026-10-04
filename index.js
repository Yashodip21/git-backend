const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const {Server} = require("socket.io");
const path = require("path");
const fs = require("fs");

const yargs = require('yargs');
const {hideBin} = require("yargs/helpers")

const {initRepo} = require("./controllers/init")
const {addRepo} = require("./controllers/add")
const {commitRepo} = require("./controllers/commit")
const {pushRepo} = require("./controllers/push")
const {pullRepo} = require("./controllers/pull")
// const {revertRepo}=require("./controllers/revert")
const { revertRepo } = require("./controllers/revert");

const mainRouter=require("./routes/main.router");
  

dotenv.config();


yargs(hideBin(process.argv))
        .command("start","Starts a new serer",{},startServer)
        .command(
            "init [repositoryId]",
            "Initialise a new repository",
            (yargs) => {
                yargs.positional("repositoryId", {
                    describe: "DevForge repository ID",
                    type: "String",
                });
            },
            (argv) => {
                initRepo(argv);
            }
        )
        .command(
            "add <file>",
            "Add a file to a repository",
            (yargs) => {
                yargs.positional("file",{
                describe:"File to add to the staging area",
                type:"String",
            });
        
        }, 
         (argv)=>{
            addRepo(argv.file);
         }
    )
         .command(
            "commit <message>",
            "Commit the staged files",
            (yargs) => {
                yargs.positional("message",{
                describe:"Commit message",
                type:"String",
            });
        
        }, commitRepo)
        .command("push","Push commmit to S3",{},pushRepo)
        .command("pull","Pull commit from S30",{},pullRepo)
        .command(
            "revert <commitID>",
            "Revert to specific commit",
            (yargs)=>{
                yargs.positional("commitID",{
                    description:"Revert commit",
                    type:"String"
                });
            }, (argv)=>{
            revertRepo(argv.commitID);
         })

            .demandCommand(1,"You need at leat one command")
            .help()
            .argv;

function startServer(){
    // console.log("Server logic called!");
    const app=express();
    const port=process.env.PORT || 3000;

    app.use(bodyParser.json());
    app.use(express.json());

    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.use("/uploads", express.static(uploadsDir));

    const mongoURI=process.env.MONGODB_URI;

    mongoose
    .connect(mongoURI)
    .then(()=> console.log("MongoDB connected!"))
    .catch((err)=> console.error("Unable to connect:",err));

    app.use(cors({origin:"*"}));

    app.use("/",mainRouter);
  
   
    let user="test";

    const httpServer=http.createServer(app);
    const io=new Server(httpServer,{
        cors:{
            origin:"*",
            method:["GET","POST"],
        },
    });
     
    io.on("connection",(socket)=>{
        socket.on("joinRoom",(userID)=>{
            user=userID;
            console.log("====");
            console.log(user);
            console.log("====");
            socket.join(userID);
        });
    });

    const db=mongoose.connection;
    db.once("open",async()=>{
        console.log('CRUD operation called');
        //CRUD Operation
    });

    httpServer.listen(port,()=>{
        console.log(`server is running on PORT ${port}`)
    });

}
