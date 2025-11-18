import express from "express";
import mongoose from "mongoose";
import cors from 'cors';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

mongoose.connect(process.env.MONGO_DB_URI)
.then(()=>{
    console.log("Database connected successfully.")
})
.catch((error)=>{
    console.error("Database connection failed: ", error)
})

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model("User", UserSchema);


app.post("/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });


        const token = jwt.sign(
            { id: user._id, email: user.email },
            "SECRET_KEY", 
            { expiresIn: "7d" }
        );


        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            token: token
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Email already exists!" });
    }
});


app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ error: "Wrong password" });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            "SECRET_KEY",
            { expiresIn: "7d" }
        );

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            token: token
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/profile", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const verified = jwt.verify(token, "SECRET_KEY");
        const user = await User.findById(verified.id);
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});

app.listen(process.env.PORT, () => console.log(`Server running port ${process.env.PORT}`));