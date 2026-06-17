const dns = require('node:dns/promises');
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dotenv = require('dotenv');
const express = require('express');
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

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
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.dir);

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send("Server is running fine!");
});

// ─────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────

// GET all teachers  — optional ?email= filter for "My Tutors" page
app.get('/teachers', async (req, res) => {
  try {
    const { email } = req.query;
    const query = email ? { userEmail: email } : {};
    const result = await tutorCollection.find(query).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch teachers.", error: err.message });
  }
});

// GET single teacher by ID
app.get('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
    if (!result) return res.status(404).json({ message: "Teacher not found." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch teacher.", error: err.message });
  }
});

// POST create a new teacher
app.post('/teachers', async (req, res) => {
  try {
    const tutorsData = req.body;
    const result = await tutorCollection.insertOne(tutorsData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to create teacher.", error: err.message });
  }
});

// PUT update a teacher
app.put('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    delete updatedData._id;
    const result = await tutorCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: "Teacher not found." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to update teacher.", error: err.message });
  }
});

// DELETE a teacher
app.delete('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Teacher not found." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete teacher.", error: err.message });
  }
});




app.get('/bookings/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await bookingCollection
      .find({ userEmail: email })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user bookings.", error: err.message });
  }
});


// PATCH decrease a teacher's available slot by 1
app.patch('/teachers/:id/decrease-slot', async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });

    const currentSlots = Number(tutor.totalSlots);
    if (currentSlots <= 0) {
      return res.status(400).json({ message: "No slots available to decrease." });
    }

    const result = await tutorCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { totalSlots: String(currentSlots - 1) } }
    );
    res.json({ message: "Slot decreased.", result });
  } catch (err) {
    res.status(500).json({ message: "Failed to decrease slot.", error: err.message });
  }
});



app.post('/booking', async (req, res) => {
  try {
    const bookingData = req.body;
    const result = await bookingCollection.insertOne(bookingData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking.", error: err.message });
  }
});

// GET all bookings (admin / dashboard use)
app.get('/bookings', async (req, res) => {
  try {
    const result = await bookingCollection.find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings.", error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 🔧 CHANGED: PATCH cancel a booking — now ALSO restores 1 slot back to
// the tutor when a booking is cancelled. Previously this route only set
// bookStatus to "cancelled" and did nothing to totalSlots.
// ──────────────────────────────────────────────────────────────────────
app.patch('/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    // find the booking first, so we know its tutorId and current status
    const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // prevent cancelling an already-cancelled booking (avoids double-restoring a slot)
    if (booking.bookStatus === "cancelled") {
      return res.status(400).json({ message: "This booking is already cancelled." });
    }

    // mark the booking as cancelled
    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { bookStatus: "cancelled" } }
    );

    // restore 1 slot to the tutor this booking belonged to
    if (booking.tutorId) {
      const tutor = await tutorCollection.findOne({ _id: new ObjectId(booking.tutorId) });
      if (tutor) {
        const currentSlots = Number(tutor.totalSlots);
        await tutorCollection.updateOne(
          { _id: new ObjectId(booking.tutorId) },
          { $set: { totalSlots: String(currentSlots + 1) } }
        );
      }
    }

    res.json({ message: "Booking cancelled and slot restored.", result });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking.", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});