import express from "express";
import WebTorrent from "webtorrent-hybrid";
import { addTorrentViaMagnet } from "./torrent/torrent-functions";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());

const torrentClient = new WebTorrent();

const torrents: any[] = [];

const port = process.env.BEAM_PORT;

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello");
});

app.post(
  "/torrent/add/magnet",
  (req: express.Request, res: express.Response) => {
    if (!req.body) {
      res.status(400).send({ message: "Bad request: nothing was provided" });
      return;
    }
    addTorrentViaMagnet(torrentClient, req.body.magnet, "/home/ked/torrents")
      .then(torrent => {
        torrents.push(torrent);
        res.sendStatus(200);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send({ message: `Internal Error: ${err}` });
      });
  }
);

app.post(
  "/torrents/progress",
  (req: express.Request, res: express.Response) => {
    res.send(
      torrents.map(torrent => Math.round(torrent.progress * 100 * 100) / 100)
    );
  }
);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
