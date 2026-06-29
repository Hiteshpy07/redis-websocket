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

app.post("/getotp",async(req,res)=>{
    const {phone}=req.body
    const typeofphone=typeof phone
    console.log(typeofphone)
    // const phonelength=phone.length
    console.log(phone)
    if(phone ){
        const otp=Math.floor(1000+Math.random()*9000)
        await redis.set(phone,otp,"EX",300)
        res.send({message:`OTP sent successfully to ${phone}`,otp:otp})
    }else{
        res.status(400).send({message:"Invalid phone number"})
    }
})

app.get("/mongodb",async (req,res)=>{
    try{
        await mongoose.connect(process.env.MONGO_URL||'mongodb://localhost:27017');
        if (mongoose.connection.readyState===1){

            res.send("MongoD3 connected successfully");
        }else{
            res.send("MongoDB connection failed");
        }
        // res.send(mongoose.connection.readyState,mongoose.connection.name);
    }catch(err){
        res.status(500).send("MongoDB connection failed");
    }
})  

app.listen(3000,()=>{
    console.log("Server is running on port 3000");
})