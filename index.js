require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];
  console.log(token);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    console.log(decoded);
    if (err) {
      console.log(err);
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.phc1bhb.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const usersCollection = client.db("21-Language").collection("users");
    const classesCollection = client.db("21-Language").collection("classes");
    const selectedCollection = client
      .db("21-Language")
      .collection("selectedClass");
    const paymentCollection = client.db("21-Language").collection("payments");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'})

      res.send({ token })
    })


    // users related apis
    // get all user
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // get role user
    app.get("/role", verifyJWT,  async (req, res) => {
      const email = req.query?.email;
      console.log(email);
      const role = await usersCollection.findOne({ email: email });
      if (role) {
        res.send(role);
      } else {
        res.send({});
      }
    });
    // post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      console.log(user);
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // set user Role
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const quary = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: body,
      };
      const result = await usersCollection.updateOne(quary, updateDoc, options);
      res.send(result);
    });

    // classes related apis
    // post a class for add class
    app.post("/class", async (req, res) => {
      const body = req.body;
      const result = await classesCollection.insertOne(body);
      res.send(result);
    });
    //  get email base class for my class
    app.get("/class/:email", async (req, res) => {
      const email = req.params.email;
      const q = { instructorEmail: email };
      const result = await classesCollection.find(q).toArray();
      res.send(result);
    });

    // get all class for managed user
    app.get("/class", async (req, res) => {
      const finds = classesCollection.find();
      const result = await finds.toArray();
      res.send(result);
    });

    // update api
    app.put("/singleClass/:id", async (req, res) => {
      const id = req.params.id;
      const q = { _id: new ObjectId(id) };
      const body = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: body,
      };
      const result = await classesCollection.updateOne(q, updateDoc, options);
      res.send(result);
    });

    app.get("/classSingle/:id", async (req, res) => {
      const id = req.params.id;
      const q = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(q);
      if (result) {
        res.send(result);
      } else {
        res.send({});
      }
    });

    // get all approved class for classes page
    app.get("/approveClass", async (req, res) => {
      const q = { status: "approve" };
      const result = await classesCollection.find(q).toArray();
      res.send(result);
    });

    // student related api
    // post class
    app.post("/selectedClass", async (req, res) => {
      const body = req.body;
      const result = await selectedCollection.insertOne(body);
      res.send(result);
    });

    // get classes for my selected classes
    app.get("/selectedClass/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const q1 = { studentEmail: email };
      const q2 = { payment: false };
      const result = await selectedCollection
        .find({ $and: [q1, q2] })
        .toArray();
      res.send(result);
    });
    // selected class delete api
    app.delete("/selectedClass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const q = { _id: new ObjectId(id) };
      const result = await selectedCollection.deleteOne(q);
      res.send(result);
    });
    // get all instractor api
    app.get("/instructor", async (req, res) => {
      const q = { role: "instractor" };
      const result = await usersCollection.find(q).toArray();
      res.send(result);
    });

    // popular class api
    app.get("/popularClass", async (req, res) => {
      const q = { status: "approve" };
      const result = await classesCollection
        .find(q)
        .sort({ enroll: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // popular instractor api
    app.get("/popularinstractor", async (req, res) => {
      const q = { role: "instractor" };
      const result = await usersCollection
        .find(q)
        .sort({ enroll: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(+price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

     // get singel class for payment

    app.get("/singleSelect/:id", async (req, res) => {
      const id = req.params.id;
      const q = { _id: new ObjectId(id) };
      const result = await selectedCollection.findOne(q);
      if (result) {
        res.send(result);
      } else {
        res.send({});
      }
    });

   
    app.put("/singleSelect/:id", async (req, res) => {
      const id = req.params.id;
      const q = { _id: new ObjectId(id) };
      const body = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: body,
      };
      const result = await selectedCollection.updateOne(q, updateDoc, options);
      res.send(result);
    });

    // post payment history
    app.post("/paymentHistory", async (req, res) => {
      const body = req.body;
      const result = await paymentCollection.insertOne(body);
      res.send(result);
    });


    // get Enrolled class
    app.get("/enrolledClass/:email", async (req, res) => {
      const email = req.params.email;
      const q= {email:email}
      const finds = paymentCollection.find(q);
      const result = await finds.toArray();
      res.send(result);
    });
    // get payment history
    app.get("/paymentHistory/:email", async (req, res) => {
      const email = req.params.email;
      const q= {email:email}
      const finds = await paymentCollection.find(q).sort({date:  -1})
      const result = await finds.toArray();
      res.send(result);
    });

    

    // Send a ping to confirm a successful connection
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
  res.send("21_Language is running...");
});
app.listen(port, (_) => {
  console.log(`21_Language API is running on port: ${port}`);
});
