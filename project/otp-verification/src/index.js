import Redis from "ioredis";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();


const app=express();
app.use(express.json());
app.use(cors({
    origin:"*"
}))
const redis=new Redis(process.env.REDIS_URL|| 'redis://localhost:6379');
const attempts=0
const timeout=30;// 5 minutes in seconds
const jwtSecret=process.env.JWT_SECRET


app.get("/",async (req,res)=>{
    const reply=await redis.ping()
    res.send(reply)
})

app.post("/getotp",async(req,res)=>{
    const phone=req.body.phone
    const typeofphone=typeof phone
    console.log(typeofphone)
    // const phonelength=phone.length
    console.log(phone)
    if(phone ){
        const attemptsKey = `attempts:${phone}`;
        let attempts = parseInt(await redis.get(attemptsKey)) || 0;

        // 2. Enforce max attempts check BEFORE anything else
        if (attempts >= 3) {
            return res.status(400).send({ message: "Maximum attempts reached. Try again later." });
        }
        const otp=Math.floor(1000+Math.random()*9000)
        if (attempts>=3){
            res.status(400).send({message:"Maximum attempts reached"})
            return
        } else if (attempts>0){
            if(attempts==1){
                timeout=30
            }else if(attempts==2){
                timeout=60
            }else if(attempts==3){
                timeout=120
            }
            res.status(400).send({message:`You have ${3-attempts} attempts left`})
            return
        }
        await redis.set(phone,otp,"EX",timeout)
        attempts+=1
        await redis.set(`attempts:${phone}`,attempts)
        res.send({message:`OTP sent successfully to ${phone}`,otp:otp})
        
    }else{
        res.status(400).send({message:"Invalid phone number"})
    }
})

app.get("/getotp/:phone",async(req,res)=>{
    const {phone}=req.params
    const otp=await redis.get(phone)
    const attemptsofotp=await redis.get(`attempts:${phone}`)
    if(otp){
        res.send({message:`OTP for ${phone} is ${otp}`})
        res.send({message:`retry in ${timeout} seconds`})
        res.send({message:`You have ${3-attemptsofotp} attempts left`})
        // const timeLeft = await redis.ttl(`otp:${phone}`);
        console.log(timeLeft)
    }else{
        res.status(400).send({message:"Invalid phone number"})
    }
})
app.post('/verifyotp/:phone',async(req,res)=>{
    const{phone}=req.params
    const {otp}=req.body
    const realotp=await redis.get(phone)
    console.log(realotp,otp)
    if(!realotp){
        res.status(400).send({message:"OTP expired or invalid"})
        return
    }
    else if(!otp){
        res.status(400).send({message:"Please provide OTP"})
        return
    }
    if(realotp==otp){
        token=jwt.sign(
            {phon:phone},
            jwtSecret,
            {expiresIn:"1h"}
        )
        res.send({
            message:"OTP verified successfully",
            token:token
        })

    }else{
        res.send({message:"Invalid OTP"

        })
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