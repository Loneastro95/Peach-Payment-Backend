require("dotenv").config();

const express = require("express");
const app = express();
const ejs = require("ejs");

/**
 * The below values can be retrieved from the checkout screen on Dashboard.
 */
const entityId = process.env.ENTITY_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const merchantId = process.env.MERCHANT_ID;
const allowlistedDomain = process.env.DOMAIN;
/**
 * The values below correspond to environment for Checkout.
 *
 * https://developer.peachpayments.com/docs/checkout-embedded#api-endpoints
 */
const authenticationEndpoint = process.env.AUTHENTICATION_ENDPOINT;
const checkoutEndpoint = process.env.CHECKOUT_ENDPOINT;
const checkoutJs = process.env.CHECKOUT_JS;

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.get("/", function (req, res) {
  res.header("Permissions-Policy", "payment self 'src'");
  res.render("index.ejs", { checkoutJs });
});

app.post("/checkout", async function (req, res) {
  // Get an access token to allow us to call the Checkout endpoint.
  const accessToken = await getAccessToken();
  // Call the Checkout endpoint to get a checkout ID for use on the frontend.
  const checkoutId = await getCheckoutId(
    accessToken,
    allowlistedDomain,
    checkoutEndpoint
  );

  return res.status(200).json({ checkoutId, entityId });
});

app.listen(3001, function () {
  console.log("Server is running on http://localhost:3001");
});

/**
 * Get an access token that can be used to validate the request to Checkout.
 *
 * Note: This access token should be reused between requests.
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

  const response = await fetch(authenticationEndpoint, requestOptions)
    .then((response) => response.json())
    .catch((error) => console.log("error", error));

  console.log(response);

  return response.access_token;
};

/**
 * Call the Checkout API to get a checkout ID.
 *
 * There are a few parameters that can be set on the request as noted above the body section.
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
    /**
     * Read more about checkout parameters at `https://developer.peachpayments.com/reference/post_v2-checkout`
     */
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

  const response = await fetch(
    `${checkoutEndpoint}/v2/checkout`,
    requestOptions
  )
    .then((response) => response.json())
    .catch((error) => console.log("error", error));

  console.log(response);

  return response.checkoutId;
};
