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

app.use(cors());
app.engine("html", ejs.renderFile);
app.set("view engine", "html");

app.get("/", function (req, res) {
  res.header("Permissions-Policy", "payment self 'src'");
  res.render("index.ejs", { checkoutJs });
});

app.post("/checkout", async function (req, res) {
  try {
    // Get an access token to allow us to call the Checkout endpoint.
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ error: "Failed to retrieve access token" });
    }

    console.log("Access Token:", accessToken);

    // Call the Checkout endpoint to get a checkout ID for use on the frontend.
    const checkoutId = await getCheckoutId(
      accessToken,
      allowlistedDomain,
      checkoutEndpoint
    );
    if (!checkoutId) {
      return res.status(500).json({ error: "Failed to retrieve checkout ID" });
    }

    console.log("Checkout ID:", checkoutId);

    // Build the URL with checkout ID
    const url = `${req.protocol}://${req.get('host')}/checkout/${checkoutId}`;
    console.log("Generated URL:", url);

    return res.status(200).json({
      url: url
    });
  } catch (error) {
    console.error("Error in /checkout route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3001, function () {
  console.log("Server is running on http://localhost:3001");
});

/**
 * Get an access token that can be used to validate the request to Checkout.
 *
 * @returns {Promise<string>} A JWT access token.
 */
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
    console.log("Access Token Response:", data);

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

/**
 * Call the Checkout API to get a checkout ID.
 *
 * @param {string} bearerToken An access token to validate request
 * @param {string} allowlistedDomain An allowlisted domain on Peach Payment's Dashboard
 * @param {string} checkoutEndpoint The API endpoint for checkout.
 * @returns {Promise<string>} A checkout ID
 */
const getCheckoutId = async (
  bearerToken,
  allowlistedDomain,
  checkoutEndpoint
) => {
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
      amount: 100,
      currency: "ZAR",
      shopperResultUrl: "https://httpbin.org/post",
      merchantTransactionId: "INV-0000001",
      nonce: (Math.random() * 100000).toString(),
    }),
  };

  try {
    const response = await fetch(
      `${checkoutEndpoint}/v2/checkout`,
      requestOptions
    );
    const data = await response.json();
    console.log("Checkout ID Response:", data);

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
