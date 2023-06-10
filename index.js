require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bthwvgc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



const dbConnect = () => {
  try {
    client.connect();
    console.log(" Database Connected Successfully✅ ");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();



const usersCollection = client.db("21-Language").collection("users");
const classesCollection = client.db("21-Language").collection("classes");
const selectedCollection = client.db("21-Language").collection("selectedClass");

app.get("/", (req, res) => {
  res.send("Learn Language");
});

// users related apis
// get all user
app.get("/users", async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});
// get role user
app.get("/role", async (req, res) => {
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
app.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const quary = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      role: body.role,
    },
  };
  const result = await usersCollection.updateOne(quary, updateDoc, options);
  res.send(result);
});


// classes related apis
// post a class for add class
app.post('/class', async (req, res)=>{
  const body=req.body
  const result=await classesCollection.insertOne(body)
  res.send(result)
})
//  get email base class for my class
app.get('/class/:email', async (req, res) => {
  const email = req.params.email;
  const q = {instructorEmail: email };
  const result = await classesCollection.find(q).toArray();
  res.send(result);
});

// get all class for managed user
app.get('/class', async (req, res)=>{
  const finds = classesCollection.find()
  const result= await finds.toArray()
  res.send(result)
})

// update api
app.put('/singleClass/:id', async (req, res)=>{
  const id =req.params.id
  const q={_id: new ObjectId(id)}
  const body =req.body
  const options={upsert: true}
  const updateDoc={
    $set: body,

  }
  const result= await classesCollection.updateOne(q, updateDoc, options)
  res.send(result)
})

app.get('/classSingle/:id', async (req,res)=>{
  const id =req.params.id
  const q={_id: new ObjectId(id)}
  const result = await classesCollection.findOne(q)
  if(result){
    res.send(result)
  }
  else{
    res.send({})
  }
})

// get all approved class for classes page
app.get('/approveClass', async (req, res)=>{
  const q ={status: 'approve'}
  const result = await classesCollection.find(q).toArray()
  res.send(result)
})

// student related api
// post class
app.post('/selectedClass', async (req,res)=>{
  const body= req.body;
  const result =await selectedCollection.insertOne(body)
  res.send(result)
})

// get classes for my selected classes
app.get('/selectedClass/:email', async (req, res) => {
  const email = req.params.email;
  const q1 = { studentEmail: email };
  const q2 = { payment: false };
  const result = await selectedCollection.find({ $and: [q1, q2] }).toArray();
  res.send(result);
});

app.delete('/selectedClass/:id',  async(req,res)=>{
  const id=req.params.id;
  const q={_id: new ObjectId(id)}
  const result =await selectedCollection.deleteOne(q)
  res.send(result)
})

app.listen(port, () => {
  console.log(`Learn Language is Process on ${port}`);
});
