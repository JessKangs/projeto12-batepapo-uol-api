import express from 'express'
import cors from 'cors';
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb';

const mongoClient = new MongoClient(process.env.MONGO_URI)
dotenv.config();

const server = express();
server.use(cors());

let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("test")
})

server.get("/", (req, res) => {
    res.send()
})

server.listen(5000)