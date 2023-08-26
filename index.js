/* 
---------------------------------
      Naming convention     
--------------------------------
users: userCollection
app.get('/users);
app.get('/users/:id)
app.post('/users)
app.patch('/user/:id)
app.get
*/

/* -------------------- jwt token steps -----------------------
1. create access_token_secret in env file (open server terminal: node => require('crypto').randomBytes(64).toString('hex'))
2. create a post api in server to create dynamically token : 
 const email = req.body;
 const token = jwt.sign({data object}, acess_secret, {expiration time});
 res.send(token);
3. now when we want to create token(likely when user want to login). so in onAuthStateChange when check user exits or not
if exist then create a axious route and pass data and take token from server.
in server jwt route is just like machine. when we call this api. then it give us a token. then in client we save in local or session storage. 
4. after above steps. now we need to verify this token.
*/
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// midleware
app.use(cors());
app.use(express.json());

// jwt middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized acess" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ktfe5gd.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    const menuCollection = await client.db("bristoBoss").collection("menu");
    const reviewCollection = await client
      .db("bristoBoss")
      .collection("reviews");
    const cartCollection = await client.db("bristoBoss").collection("carts");
    const usersCollection = await client.db("bristoBoss").collection("users");

    // create jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //  **************************** users related api ***********************************
    // insert user to users database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const checkUser = await usersCollection.findOne(query);
      if (checkUser) {
        return res.status(400).send({ message: "user already exits" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // get all users
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        if (result) {
          console.log("data poaa gese");
          res.status(200).send(result);
        } else {
          console.log("data paoa jainai");
          res.status(400).send({ message: "user not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "internal connection error" });
      }
    });
    // delete single user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await usersCollection.deleteOne(query);
        if (result.deletedCount > 0) {
          res.status(200).send(result);
        } else {
          res.status(404).send({ message: "user not found" });
        }
      } catch (error) {
        res.status(400).send({ message: "internal connection error" });
      }
    });
    // set user to admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      try {
        const result = await usersCollection.updateOne(query, updatedDoc);
        if (result.modifiedCount > 0) {
          res.status(200).send(result);
        } else {
          res.status(400).send({ message: "user not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "internal connection error" });
      }
    });
    // get the menu
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    // get the reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // get carts
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (req.decoded.user.email !== email) {
        console.log("decoded and query gmail: ", req.decoded, email);
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }
      if (!email) {
        res.send([]);
      } else {
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      }
    });
    // delete cart
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await cartCollection.deleteOne(query);
        if (result.deletedCount > 0) {
          res.status(200).send(result);
        } else {
          res.status(400).send({ message: "item not found" });
        }
      } catch (error) {
        console.log("Error while Deleting item: ", error);
        res
          .status(500)
          .send({ message: "internal server error while deleting item" });
      }
    });

    // add cart
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("bristo boss is running");
});

app.listen(port);
