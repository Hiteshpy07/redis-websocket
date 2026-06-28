import Redis from "ioredis";
import express from "express";
import mongoose from "mongoose";

const app=express();
app.use(express.json());

const redis=new Redis(process.env.REDIS_URL|| 'redis://localhost:6379');

app.get("/",async (req,res)=>{
    const reply=await redis.ping()
    res.send(reply)
})



app.listen(3000,()=>{
    console.log("Server is running on port 3000");
})