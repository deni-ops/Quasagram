/*
  dependencies
*/

const express = require("express");
const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");

/*
  config - express
*/

const app = express();

/*
  config - firebase
*/

const serviceAccount = require("./quasagram-6b4de-8e066134a44f.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

/*
  endpoint - posts
*/

app.get("/posts", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");

  let posts = [];
  db.collection("posts")
    .orderBy("date", "desc")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        // console.log(doc.id, "=>", doc.data());
        posts.push(doc.data());
      });
      response.send(posts);
    });
});

/*
  listen
*/

app.listen(3000, () => {
  console.log(`Server is listening on some port`);
});
