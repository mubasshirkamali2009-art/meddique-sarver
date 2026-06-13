const dns=require('node:dns/promises')
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dontenv= require('dotenv')
const express =require('express')
const cors =require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dontenv.config()

const uri = process.env.MONGODB_URI;



const app = express()
 



const PORT =process.env.PORT

app.use(cors())
app.use(express.json())


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



const db = client.db("meddique")

const tutorCollection= db.collection("tutors")

app.get('/teachers'  , async (req , res) => {
  const result = await tutorCollection.find().toArray()
  res.json(result)
})



app.get("/teachers/:id" , async (req , res) =>{
  const {id} = req.params
  const result= await tutorCollection.findOne({_id: new ObjectId(id)})
  res.json(result)
} )




app.post('/teachers' ,async (req ,res ) => {
  const tutorsData = req.body

  console.log(tutorsData)
 const result = await tutorCollection.insertOne(tutorsData)

  res.json(result)
})

app.delete("/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});












    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/'  , (req ,res ) => {
    res.send("Server is runnig fine!")
})

app.listen(PORT , ()=>{
    console.log(`Server runnig on port ${PORT}`)
})







