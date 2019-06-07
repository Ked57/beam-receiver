import express from "express";
import WebTorrent from "webtorrent-hybrid";
import {
  addTorrentViaMagnet,
  createTorrentObject,
  fetchUsersTorrents,
  getDownloadInfoFromTorrent,
  restorePreviousTorrents,
  isValidTorrent
} from "./torrent/torrent-functions";
import bodyParser from "body-parser";
import multer from "multer";
import { initConfig } from "./config/config";
import {
  parseBasicAuth,
  createUser,
  authenticate,
  generateToken,
  parseBearerAuth,
  logout,
  authenticateViaToken
} from "./auth/auth";
import {
  loadDb,
  generateEmptyDB,
  registerUser,
  saveDb
} from "./db/db-functions.";
import cors from "cors";
const configPath = process.env.BEAM_CONFIGPATH;
if (!configPath) {
  throw new Error(
    "Error starting the app, no config path provided. Provide one using the env variable BEAM_CONFIGPATH"
  );
}
const dbPath = process.env.BEAM_DBPATH;
if (!dbPath) {
  throw new Error(
    "Error starting the app, no db path provided. Provide one using the env variable BEAM_DBPATH"
  );
}

const app = express();

app.use(cors());
app.use(bodyParser.json());

const upload = multer();
const config = initConfig(configPath);
const db = loadDb(dbPath) || generateEmptyDB();
if (db.users.length <= 0) {
  createUser("admin", "admin", config.saltRounds, true).then(user =>
    registerUser(db, user)
      .then(() => {
        saveDb(db, dbPath);
        console.info(
          `WARNING: There's no user registered on your database. 
        We've created one where username=admin and password=admin. 
        You'll be prompted to change it on login`
        );
      })
      .catch(err => {
        console.error("Error registering an user => ", err);
      })
  );
}

const torrentClient = new WebTorrent();
// No longer restoring previous torrents since it's not really functionnal at the moment, will do later
restorePreviousTorrents(db, torrentClient, config.downloadPath);

const port = process.env.BEAM_PORT;

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello");
});

app.post(
  "/api/torrent/add/file",
  upload.single("file"),
  (req: express.Request, res: express.Response) => {
    if (!req.headers.authorization) {
      res.status(403).send({ message: "You're not authorized to do that" });
      return;
    }
    try {
      console.log(req.headers.authorization);
      const user = authenticateViaToken(
        db,
        parseBearerAuth(req.headers.authorization)
      );
      if (!req.file) {
        console.error("Error adding a torrent via file: No file provided");
        res.status(400).send({ message: "No file provided" });
        return;
      }
      addTorrentViaMagnet(
        torrentClient,
        req.file.buffer,
        `${config.downloadPath}/${user.username}`
      )
        .then(torrent => {
          db.torrents.push(createTorrentObject(torrent, user));
          saveDb(db, dbPath);
          res.sendStatus(200);
        })
        .catch(err => {
          console.error(err);
          res.status(500).send({ message: err });
        });
      res.sendStatus(200);
    } catch (err) {
      console.error("Error trying to add a torrent via file => ", err);
      res.status(403).send({ message: err });
    }
  }
);

app.post(
  "/api/torrent/add/magnet",
  (req: express.Request, res: express.Response) => {
    if (!req.headers.authorization) {
      res.status(403).send({ message: "You're not authorized to do that" });
      return;
    }
    if (!req.body) {
      res.status(400).send({ message: "Bad request: nothing was provided" });
      return;
    }
    try {
      const user = authenticateViaToken(
        db,
        parseBearerAuth(req.headers.authorization)
      );
      addTorrentViaMagnet(
        torrentClient,
        req.body.source,
        `${config.downloadPath}/${user.username}`
      )
        .then(torrent => {
          db.torrents.push(createTorrentObject(torrent, user));
          saveDb(db, dbPath);
          res.sendStatus(200);
        })
        .catch(err => {
          console.error(err);
          res.status(500).send({ message: err });
        });
    } catch (err) {
      console.error("Error trying to add a torrent via magnet => ", err);
      res.status(403).send({ message: err });
    }
  }
);

app.post("/api/torrents", (req: express.Request, res: express.Response) => {
  if (!req.headers.authorization) {
    res.status(403).send({ message: "You're not authorized to do that" });
    return;
  }
  if (!req.body) {
    res.status(400).send({ message: "Bad request: nothing was provided" });
    return;
  }
  try {
    const user = authenticateViaToken(
      db,
      parseBearerAuth(req.headers.authorization)
    );
    const usersTorrents = fetchUsersTorrents(db.torrents, user);
    res.send(
      usersTorrents
        .map((torrent, index) => {
          if (!isValidTorrent(torrent) || !torrent.torrent) {
            // for lack of better option
            console.error(
              "Couldn't find torrent or torrent definition is invalid, deleting it..."
            );
            db.torrents.splice(index, 1);
            saveDb(db, dbPath);
            return {};
          }
          return {
            infoHash: torrent.infoHash,
            name: torrent.name,
            info: getDownloadInfoFromTorrent(torrent.torrent)
          };
        })
        .filter(torrent => isValidTorrent(torrent) && torrent.torrent)
    );
  } catch (err) {
    console.error("Error fetching the torrent list", err);
    res.status(403).send({ message: err });
  }
});

app.post(
  "/api/user/create",
  async (req: express.Request, res: express.Response) => {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.match(/Basic .*/)
    ) {
      res.status(403).send({
        message: "Unauthorized: Payload doesn't match specifications"
      });
      return;
    }
    const [username, password] = parseBasicAuth(req.headers.authorization);
    registerUser(
      db,
      await createUser(username, password, config.saltRounds, false)
    )
      .then(() => {
        saveDb(db, dbPath);
        res.sendStatus(200);
      })
      .catch(err => {
        console.error("Error registering an user => ", err);
        res.status(500).send({ message: err });
      });
  }
);

app.post(
  "/api/user/login",
  async (req: express.Request, res: express.Response) => {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.match(/Basic .*/)
    ) {
      res.status(403).send({
        message: "Unauthorized: Payload doesn't match specifications"
      });
      return;
    }
    const [username, password] = parseBasicAuth(req.headers.authorization);
    authenticate(db, username, password)
      .then(isAuthenticated => {
        if (!isAuthenticated) {
          throw new Error("Wrong password");
        }
        res.send({ token: generateToken(db, username) });
        saveDb(db, dbPath);
      })
      .catch(err => {
        console.error("Error trying to login => ", err);
        res.status(403).send({ message: err });
      });
  }
);

app.post(
  "/api/user/logout",
  async (req: express.Request, res: express.Response) => {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.match(/Bearer .*/)
    ) {
      res.status(403).send({
        message: "Unauthorized: Payload doesn't match specifications"
      });
      return;
    }
    const token = parseBearerAuth(req.headers.authorization);
    try {
      logout(db, token);
      saveDb(db, dbPath);
      res.sendStatus(200);
    } catch (err) {
      console.error("Error trying to logout => ", err);
      res.status(403).send({ message: err });
    }
  }
);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
