const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://solo-sphere-session.web.app"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(cookieParser());

//verify middleware

const logger = async (req, res, next) => {
  console.log("called", req.hostname, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("value of token ", token);
  if (!token) {
    return res.status(401).send({ message: "unAthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unAthorized" });
    }
    console.log("value of the token", decoded);
    req.user = decoded;
    next();
  });
};
// require('crypto').randomBytes(64).toString('hex')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9zrvau.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const jobsCollection = client.db("solosphere").collection("jobs");
    const bidsCollection = client.db("solosphere").collection("bids");
    //auth realate api

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRECT, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // data realate api
    app.get("/jobs", logger, async (req, res) => {
      console.log("token ", req.cookies.token);
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });
    app.get("/job/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });
    //get all posted data
    app.get("/jobs/:email", logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      console.log("from valid", req.user);
      const filter = { buyeremail: email };
      const result = await jobsCollection.find(filter).toArray();
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    app.post("/bid", async (req, res) => {
      const bid = req.body;
      const result = await bidsCollection.insertOne(bid);
      res.send(result);
    });
    app.post("/job", async (req, res) => {
      const jobsData = req.body;
      const result = await jobsCollection.insertOne(jobsData);
      res.send(result);
    });

    //delete

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("this is solo sphehre website running");
});

app.listen(port, () => {
  console.log(`soloSphere running on http://localhost:${port}`);
});
