import express, { response } from 'express'
import cors from 'cors';
import joi from 'joi';
import dayjs from 'dayjs';

import dotenv from 'dotenv'
import { MongoClient } from 'mongodb';
dotenv.config();

const server = express();
server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI)

let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("test")
})

const participanteSchema = joi.object({
    name: joi.string().required(),
    
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message','private_message'),
    from: joi.required(),
    time: joi.required()
    
})



// ENTRAR NA SALA

server.post("/participants", async (req, res) => {
    const data = { name: req.body.name };
    const validation = participanteSchema.validate(data, { abortEarly: true});

    const { user } = req.headers;

    if (validation.error) {
        console.log(validation.error.details)
        res.status(422).send(validation.error)
        }


    try {
       
        const validate = await db.collection('participants').find({ name: data.name }).toArray()
        console.log(validate)

          if ( validate.length === 0 ) {

            const response = await db.collection('participants').insertOne( { name: data.name, lastStatus: Date.now()})

            await db.collection('messages').insertOne({from: user, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:ss')})

            console.log(response)
    
            res.status(201).send("OK") 
    
            //mongoClient.close()
          } else {
        
                res.status(409).send("Usuário já existente")

          }
     
    } catch ( error ) {
            res.status(422).send("error")
            //mongoClient.close()
    }

 
})

    //PEGAR LISTA DE PARTICIPANTES

    server.get("/participants", async (req, res) => {
        try {
            const response = await db.collection('participants').find().toArray()
    
           
            //console.log(response)
        res.status(201).send(response)

        mongoClient.close()
        } catch (error) {
            res.status(404)
        }
    })
    

    //ENVIAR MENSAGEM

    server.post("/messages", async (req, res) => {
        const { user } = req.headers;

        const data = { to: req.body.to, text: req.body.text, type: req.body.type, from: req.headers.user, time: dayjs().format('HH:MM:ss')} 

        const validation = messageSchema.validate(data, { abortEarly: true});

        if (validation.error) {
            console.log(validation.error.details)
            res.status(422).send(validation.error)
            }

        try {
           
           const resposta = await db.collection('participants').find( { name: user } ).toArray()

            if ( resposta !== 0) {
                const response = await db.collection('messages').insertOne( data )
        
                res.status(201).send("OK") 
                }

             else { res.status(422).send("Usuário não encontrado")}
        
                //mongoClient.close()
         
        } catch ( error ) {
                res.status(422).send("DEURUIM")
                //mongoClient.close()
        }
            

    })
    
    //PEGAR MENSAGENS

    server.get("/messages", async (req, res) => {
        const { user } = req.headers;
        const { limit } = req.query;

        try {

            const response = await db.collection('messages').find().toArray()

            const list = await response.filter(
                (value) => !(value.type === 'private_message' && value.from !== user)
            )
            const Newlist = list.reverse()

            console.log(Newlist)

            if (limit) {
                res.status(201).send(Newlist.slice(-limit))
        
            } 
            else {
                res.status(201).send(Newlist)
            }

        mongoClient.close()
        } catch (error) {
            res.status(422).send('error')
        }
    })
    
    
    //POST STATUS

    server.post("/status", async (req, res) => {
        const { user } = req.headers;

           const resposta = await db.collection('participants').find( { name: user } )
            console.log("LULU")
           console.log(resposta)

            if ( resposta ) {

                const response = await db.collection('participants').updateOne( { lastStatus: resposta.lastStatus },
                    { $set: { lastStatus: Date.now()}})

                    console.log(response)
                    res.sendStatus(201)
             
                } else {
                    res.sendStatus(404)
                }
        
                //mongoClient.close()
         
    
            

    })

    //REMOÇÃO AUTOMÁTICA 

    async function verificarUsu() {
        const lista = await db.collection("participants").find().toArray()

        lista.forEach((value) => {
            const time = Date.now() - value.lastStatus;
            if (time > 10) {
                db.collection("messages").insertOne({
                    from: value.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:MM:ss')})
            }
            db.collection("participants").deleteOne({
                name: value.name
            })
        })
    }

    setInterval(verificarUsu, 15000)


server.listen(5000)
console.log("Ouvindo na porta 5000...")