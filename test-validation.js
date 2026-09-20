import { validateLead } from './server/middleware/validate.js';
import { validationResult } from 'express-validator';
import express from 'express';
import request from 'supertest';

const app = express();
app.use(express.json());

app.post('/test', validateLead, (req, res) => {
  res.json({ success: true });
});

async function run() {
  const payload = {
    name: "Ramesh Joshi",
    phone: "+91 98765 43210",
    email: "",
    projectId: 1,
    config: "2 BHK",
    value: 6500000,
    source: "Facebook Ads",
    stage: 'new',
    rep: "Rohan Mehta",
    tags: ["hot-lead"]
  };
  
  const res = await request(app).post('/test').send(payload);
  console.log("Status:", res.status);
  console.log("Body:", res.body);
}

run();
