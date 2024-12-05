const express = require("express");
const app = express();
const ejs = require("ejs");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", path.join(__dirname, "views"));
app.use(cors()); 
app.use(express.json());

// Ticket types and prices
const tickets = {
  "regular": 50, 
  "vip": 100,   
};


async function getAccessToken() {
  return process.env.ACCESS_TOKEN; // Replace with actual API call to get access token
}

async function saveOrder(orderId, tickets, total) {
  console.log("Order saved:", { orderId, tickets, total });
  return true; // Simulating a successful save
}

// async function getCheckoutId(accessToken, total, orderId) {
//   return `${orderId}-${Math.random().toString(36).substring(2, 15)}`;
// }

// Route to handle ticket ordering
app.post("/order-tickets", async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const order = req.body.order;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: "No tickets selected or invalid order format" });
    }

    // Calculate total cost of tickets
    const total = order.reduce((sum, ticket) => {
      const price = tickets[ticket.type] * ticket.quantity;
      return sum + price;
    }, 0);

    const orderId = Math.random().toString(36).substring(2, 15);
    await saveOrder(orderId, order, total);

    const checkoutId = '5fd3715c1056474687b55abca2c5ad7f';
    const url = `${req.protocol}://${req.get("host")}/checkout/${checkoutId}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error in ticket order process:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to handle checkout page
app.get("/checkout/:checkoutId", (req, res) => {
  try {
    res.header("Permissions-Policy", "payment self 'src'");
    return res.render("index.ejs", {
      checkoutId: req.params.checkoutId,
      key: process.env.PEACH_PAYMENTS_ENTITY_ID,
    });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => {
  console.log("Ticket ordering system running on localhost:3000");
});
