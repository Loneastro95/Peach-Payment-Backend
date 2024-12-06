require("dotenv").config();

const express = require("express");
const app = express();
const ejs = require("ejs");
const cors = require("cors")

const entityId = process.env.ENTITY_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const merchantId = process.env.MERCHANT_ID;
// const allowlistedDomain = process.env.DOMAIN;

const authenticationEndpoint = process.env.AUTHENTICATION_ENDPOINT;
const checkoutEndpoint = process.env.CHECKOUT_ENDPOINT;
const checkoutJs = process.env.CHECKOUT_JS;


app.engine("html", ejs.renderFile);
app.set("view engine", "html");
// app.set("views", path.join(__dirname, "views"));
app.get("/", function (req, res) {
  res.header("Permissions-Policy", "payment self 'src'");
  res.render("index.ejs", { checkoutJs });
});
app.use(cors());

app.post("/checkout", async function (req, res) {
    // Get an access token to allow us to call the Checkout endpoint.
    const accessToken = await getAccessToken();
    console.log(accessToken)
    // Call the Checkout endpoint to get a checkout ID for use on the frontend.
    const checkoutId = await getCheckoutId(
      accessToken,
    // allowlistedDomain,
      checkoutEndpoint
    );
  console.log(checkoutEndpoint)
    return res.status(200).json({ checkoutId, entityId });
  });
  
  app.listen(3000, function () {
    console.log("Server is running on localhost:3000");
  });
  
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
  
    // console.log(response);
  
    return response.access_token;
  };

 

  const getCheckoutId = async (
    bearerToken,
    // allowlistedDomain,
    checkoutEndpoint
  ) => {

    const headers = new Headers();
    // headers.append("Origin", allowlistedDomain);
    // headers.append("Referer", allowlistedDomain);
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
        shopperResultUrl: "https://www.google.com",
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