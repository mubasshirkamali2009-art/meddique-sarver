const dns = require('node:dns/promises');
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dotenv = require('dotenv');
const express = require('express');
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("meddique");
const tutorCollection = db.collection("tutors");
const bookingCollection = db.collection("bookings");

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Server is running fine!");
});

app.get('/teachers', async (req, res) => {
  const result = await tutorCollection.find().toArray();
  res.json(result);
});

app.get('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.post('/teachers', async (req, res) => {
  const tutorsData = req.body;
  const result = await tutorCollection.insertOne(tutorsData);
  res.json(result);
});

app.put('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  delete updatedData._id;
  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.json(result);
});

app.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.patch('/teachers/:id/decrease-slot', async (req, res) => {
  const { id } = req.params;
  const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
  if (!tutor) {
    return res.status(404).json({ message: "Tutor not found" });
  }
  const currentSlots = Number(tutor.totalSlots);
  if (currentSlots <= 0) {
    return res.status(400).json({ message: "No slots available to decrease" });
  }
  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { totalSlots: String(currentSlots - 1) } }
  );
  res.json(result);
});




app.post('/booking', async (req, res) => {
  const bookingData = req.body;
  const result = await bookingCollection.insertOne(bookingData);
  res.json(result);
});
  app.get("/booking/:userId" , async (req , res) => {
    const {userId} = req.params
    console.log(userId)
    const result =await bookingCollection.find({ userId:userId})
    
  })




app.get('/bookings', async (req, res) => {
  const result = await bookingCollection.find().toArray();
  res.json(result);
});

app.get('/bookings/user/:email', async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection.find({ userEmail: email }).toArray();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});