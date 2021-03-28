require("dotenv").config();
const app = require("express")();
const path = require("path");
const PORT = process.env.PORT || 3000;
const fetch = require("node-fetch");

const redis = require("redis");

// make a connection to the local instance of redis
// const client = redis.createClient(6379);
const client = redis.createClient(6380, process.env.REDISCACHEHOSTNAME, {
  auth_pass: process.env.REDISCACHEKEY,
  tls: { servername: process.env.REDISCACHEHOSTNAME },
});

client.on("connect", function () {
  console.log("You are now connected");
});

app.get("/posts/:id", (req, res) => {
  const id = req.params.id;

  client.get(id, async (err, post) => {
    if (post) {
      console.log(post);
      return res.status(200).send({
        error: false,
        message: `Fetched post from the cache`,
        data: JSON.parse(post),
      });
    } else {
      fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
        .then((response) => response.json())
        .then((json) => {
          console.log(json);
          // 180s = 3 minutes, setex method is used to set the key to hold a string value in the store for a particular number of seconds
          client.setex(id, 180, JSON.stringify(json));
          return res.send({
            error: false,
            data: json,
            message: "Fetched from external server.",
          });
        });
    }
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));
  app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
