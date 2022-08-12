const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
// -------------
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//

// var async = require('async');

// jwt very
const jwtVeryFy = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).send({ message: "unAuthorization access" });
  }
  const authToken = header.split(" ")[1];
  // invalid token
  jwt.verify(
    authToken,
    process.env.ACCESS_SECRET_TOKEN,
    function (err, decoded) {
      // err
      if (err) {
        // console.log(err);
        res.status(403).send({ message: "forbidden access" });
      }
      req.decoded = decoded;
      next();
    }
  );
};

const stripe = require("stripe")(process.env.STRIPE_SECREET_KEY);

/* =========== */
// const uri ="mongodb+srv://laptop:PmEicJBzsgHgT0nJ@cluster0.izfe9.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.izfe9.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// console.log(uri);

async function run() {
  try {
    client.connect();
    const computerCollection = client.db("laptop").collection("computers");
    const monitorCollection = client.db("laptop").collection("monitors");
    const tabletCollection = client.db("laptop").collection("tablets");
    const userCollection = client.db("laptop").collection("users");
    const orderCollection = client.db("laptop").collection("orders");
    const paymentCollection = client.db("laptop").collection("payment");
    const ratingCollection = client.db("laptop").collection("ratings");
    const profileCollection = client.db("laptop").collection("profiles");

    // **********

    //  all computers product load
    app.get("/computer", async (req, res) => {
      const result = await computerCollection.find().toArray();
      res.send(result);
    });

    app.get("/computer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await computerCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // **********

    //  all monitor Apa load
    app.get("/monitor", async (req, res) => {
      const result = await monitorCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });

    app.get("/monitor/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const result = await monitorCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // ===============Tablet=============
    app.get("/tablet", async (req, res) => {
      const result = await tabletCollection.find().toArray();
      res.send(result);
    });

    app.get("/tablet/:id", async (req, res) => {
      const id = req.params.id;
      const result = await tabletCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // ____________________________ta________________________
    app.put("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      console.log(filter);
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await profileCollection.updateOne(filter, updateDoc,option);
      console.log(result);
      res.send(result);
    });
    // load Profile data 
    app.get("/profile", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const filter = {email: email}
      console.log(filter);
      const result = await profileCollection.findOne(filter)
      res.send(result);
    });
    // ____________________________END_____________________________

    // ===================user============
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.put("/user/:email", jwtVeryFy, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      const requester = await userCollection.findOne({ email: decodedEmail });
      if (requester.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(402).send({ message: "forbidden access" });
      }
    });

    // =============
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      let isAdmin = false;
      if (user.role === "admin") {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    });

    // =============
    app.put("/user", async (req, res) => {
      const email = req.query.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: "12d" }
      );

      res.send({ result, token });
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: ObjectId(id) });
      // console.log(result, "delete");
      res.send(result);
    });

    //  Payment
    app.post("/create-payment-intent", jwtVeryFy, async (req, res) => {
      const { price } = req.body;

      const amount = parseFloat(price) * 1;
      // console.log('amount', amount);

      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "eur",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

    app.post("/order", async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/order/:email", async (req, res) => {
      const email = req.params.email;
      const result = await orderCollection.find({ email: email }).toArray();
      res.send(result);
    });

    //  payment id order
    app.get("/payment/order/:id", jwtVeryFy, async (req, res) => {
      const id = req.params.id;
      const result = await orderCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // rating
    app.post("/rating", async (req, res) => {
      const result = await ratingCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/ratting", async (req, res) => {
      const result = await ratingCollection.find({}).toArray();
      res.send(result);
    });

    //  =======================================working=======
    app.patch("/payment/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: "paid",
          status: "pending",
          transactionId: payment.transactionId,
          //
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updateBooing = await orderCollection.updateOne(query, updateDoc);
      console.log(updateBooing);
      res.send(updateBooing);
    });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await orderCollection.deleteOne({ _id: ObjectId(id) });

      console.log(result, "delete");
      res.send(result);
    });

    app.get("/manageOrder", jwtVeryFy, async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.send(result);
    });

    //
    app.delete("/manageOrder/:id", async (req, res) => {
      const id = req.params.id;
      const result = await orderCollection.deleteOne({ _id: ObjectId(id) });
      console.log(result, "delete");
      res.send(result);
    });

    // manageProduct
    app.patch("/managePayOut/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      console.log(status);
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { status: "shipped" },
      };
      const result = await orderCollection.updateOne(query, updateDoc);
      console.log(result);
      res.send(result);
    });

    // add Product -> 3 types collection add but one collection  I add
    app.post("/addProduct", async (req, res) => {
      const result = await computerCollection.insertOne(req.body);
      res.send(result);
    });
  } finally {
    // client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Laptop website is running");
});

app.listen(port, () => {
  console.log("Laptop server running port --> ", port);
});
