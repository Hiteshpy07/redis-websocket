import Redis from "ioredis";
import express from "express";
import mongoose from "mongoose";

const app=express();
app.use(express.json());

const redis=new Redis(process.env.REDIS_URL|| 'redis://localhost:6379');

const attempts=0
const [timeout, setTimeoutValue] = useState(30); // 5 minutes in seconds


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
        if (attempts>=3){
            res.status(400).send({message:"Maximum attempts reached"})
            return
        } else if (attempts>0){
            if(attempts==1){
                setTimeoutValue(30)
            }else if(attempts==2){
                setTimeoutValue(60)
            }else if(attempts==3){
                setTimeoutValue(120)
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
    if(realotp==otp){
        res.send({message:"OTP verified successfully"})
    }else{
        res.send({message:"Invalid OTP"})
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