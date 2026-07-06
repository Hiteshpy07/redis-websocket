import Redis from "ioredis";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_for_dev";

app.get("/", async (req, res) => {
    const reply = await redis.ping();
    res.send(reply);
});

// ROUTE 1: REQUEST OTP
app.post("/getotp", async (req, res) => {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
        return res.status(400).send({ message: "Invalid 10-digit phone number" });
    }

    const attemptsKey = `attempts:${phone}`;
    const lockKey = `lock:${phone}`;

    // 1. Check if the user is currently cooling down from a previous attempt
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
        const timeLeft = await redis.ttl(lockKey);
        return res.status(429).send({ message: `Please wait ${timeLeft} seconds before requesting a new OTP.` });
    }

    // 2. Fetch or increment total attempts
    let attempts = parseInt(await redis.get(attemptsKey)) || 0;
    if (attempts >= 3) {
        return res.status(423).send({ message: "Maximum attempts reached. Please start over later." });
    }

    // Increment attempt count
    attempts += 1;
    await redis.set(attemptsKey, attempts, "EX", 900); // Keep tracking attempts for 15 minutes

    // 3. Determine the dynamic cooldown window (Sliding Timer)
    let currentTimeout = 30; // 1st time
    if (attempts === 2) currentTimeout = 60; // 2nd time
    if (attempts >= 3) currentTimeout = 300; // 3rd time (5 mins lock)

    // Set a lock key to enforce the countdown restriction
    await redis.set(lockKey, "active", "EX", currentTimeout);

    // 4. Generate a 6-digit numeric OTP (to match your 6-box frontend layout)
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Save the active valid OTP inside Redis
    await redis.set(`otp:${phone}`, otp, "EX", 300); // Valid to verify for 5 minutes

    console.log(`[SMS Gateway Simulate] Phone: ${phone} | OTP: ${otp} | Lockout: ${currentTimeout}s`);

    res.send({
        message: `OTP sent successfully to ${phone}`,
        otp: otp, // Sending it back for easy testing on screen
        cooldown: currentTimeout,
        attemptsLeft: 3 - attempts
    });
});

// ROUTE 2: VERIFY OTP
app.post('/verifyotp/:phone', async (req, res) => {
    const { phone } = req.params;
    const { otp } = req.body; // Expects a clean string "123456"

    if (!otp) {
        return res.status(400).send({ message: "Please provide the OTP code." });
    }

    // Pull correct value from Redis
    const realOtp = await redis.get(`otp:${phone}`);

    if (!realOtp) {
        return res.status(400).send({ message: "OTP has expired or never existed. Request a new one." });
    }

    // Match validation
    if (realOtp === otp.toString().trim()) {
        // Clear all session states in Redis upon successful authorization
        await redis.del(`otp:${phone}`);
        await redis.del(`lock:${phone}`);
        await redis.del(`attempts:${phone}`);

        // Sign explicit authentication pass token
        const token = jwt.sign(
            { phoneNumber: phone },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.send({
            message: "OTP verified successfully",
            token: token
        });
    } else {
        return res.status(400).send({ message: "Invalid OTP code entered." });
    }
});

app.get("/mongodb", async (req, res) => {
    try {
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/otp-db');
        if (mongoose.connection.readyState === 1) {
            res.send("MongoDB connected successfully");
        } else {
            res.send("MongoDB connection failed");
        }
    } catch (err) {
        res.status(500).send("MongoDB connection failed");
    }
});

app.listen(3000, () => console.log("Server is running on port 3000"));