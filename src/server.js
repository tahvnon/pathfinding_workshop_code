const express = require("express");
const app = express();
const port = 8000;

app.use(express.static("static"));

app.get("/foo", (req, res) => {
  res.send("Hello rribbit rribbit?!");
});

app.listen(port, () => console.log(`listening on port ${port}`));
