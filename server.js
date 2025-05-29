require("dotenv").config();

const express = require("express");
const app = express();
const ejs = require("ejs");
const cors = require("cors");

const entityId = process.env.ENTITY_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const merchantId = process.env.MERCHANT_ID;
const allowlistedDomain = process.env.DOMAIN;
const authenticationEndpoint = process.env.AUTHENTICATION_ENDPOINT;
const checkoutEndpoint = process.env.CHECKOUT_ENDPOINT;
const checkoutJs = process.env.CHECKOUT_JS;

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  optionSuccessStatus: 200
  };
  
  // app.use(cors(corsOptions));

  // Enable CORS for all routes
app.use(cors());

// Handle preflight requests for all routes
app.options('*', cors());

// Middleware
//app.use(cors());
app.use(express.json()); // Parses JSON request bodies
app.engine("html", ejs.renderFile);
app.set("view engine", "html");

// Serve the homepage
app.get("/", function (req, res) {
  res.header("Permissions-Policy", "payment self 'src'");
  res.render("index.ejs", { checkoutJs });
});

// Checkout route
app.post("/checkout", async function (req, res) {
  try {
    const { amount } = req.body; // Get the amount from the request body
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    // Get an access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ error: "Failed to retrieve access token" });
    }

    console.log("Access Token:", accessToken);

    // Get a checkout ID
    const checkoutId = await getCheckoutId(accessToken, allowlistedDomain, checkoutEndpoint, amount);
    if (!checkoutId) {
      return res.status(500).json({ error: "Failed to retrieve checkout ID" });
    }

    console.log("Checkout ID:", checkoutId);

    // Always use https for the URL
    const url = `https://peach-payment-backend.onrender.com/checkout/${checkoutId}`;

    console.log("Generated URL:", url);

    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error in /checkout route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/checkout/:checkoutId", async (req, res) => {
  try {
    const checkoutId = req.params.checkoutId;
    const key = entityId;

    console.log("Rendering EJS with:", { checkoutId, key }); // Debug log

    res.header("Permissions-Policy", "payment self 'src'");
    return res.render("index.ejs", { checkoutId, key });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.listen(3001, function () {
  console.log("Server is running on http://localhost:3001");
});

// Helper function: Get access token
const getAccessToken = async () => {
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      clientId,
      clientSecret,
      merchantId,
    }),
  };

  try {
    const response = await fetch(authenticationEndpoint, requestOptions);
    const data = await response.json();

    if (response.ok && data.access_token) {
      return data.access_token;
    } else {
      throw new Error("Failed to retrieve access token");
    }
  } catch (error) {
    console.error("Error in getAccessToken:", error);
    return null;
  }
};

// Helper function: Get checkout ID
const getCheckoutId = async (bearerToken, allowlistedDomain, checkoutEndpoint, amount) => {
  const headers = new Headers();
  headers.append("Origin", allowlistedDomain);
  headers.append("Referer", allowlistedDomain);
  headers.append("Authorization", `Bearer ${bearerToken}`);
  headers.append("Content-Type", "application/json");

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      authentication: {
        entityId,
      },
      amount, // Use the dynamic amount from the request body
      currency: "ZAR",
      shopperResultUrl: "https://httpbin.org/post",
      merchantTransactionId: "INV-0000001",
      nonce: (Math.random() * 100000).toString(),
    }),
  };

  try {
    const response = await fetch(`${checkoutEndpoint}/v2/checkout`, requestOptions);
    const data = await response.json();

    if (response.ok && data.checkoutId) {
      return data.checkoutId;
    } else {
      throw new Error("Failed to retrieve checkout ID");
    }
  } catch (error) {
    console.error("Error in getCheckoutId:", error);
    return null;
  }
};
