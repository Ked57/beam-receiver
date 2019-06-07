import { User } from "user";
import { Torrent } from "torrent";
import { Db } from "db";

export const addTorrentViaMagnet = (
  torrentClient: any,
  source: any,
  path: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject("No source url provided");
    }
    try {
      console.log("source", source);
      torrentClient.add(source, { path }, (torrent: any) => {
        torrent.on("done", () => {
          console.log("torrent download finished");
        });
        console.log("Torrent added");
        resolve(torrent);
      });
    } catch (err) {
      console.error("Error adding torrent via magnet", err);
      reject(err);
    }
  });
};

export const createTorrentObject = (torrent: any, user: User): Torrent => {
  return {
    infoHash: torrent.infoHash,
    linkedUser: user.username,
    name: torrent.name,
    torrent
  };
};

export const getDownloadInfoFromTorrent = (torrent: any) => {
  if (!torrent) {
    throw new Error("Torrent is undefined");
  }
  return {
    progress: Math.round(torrent.progress * 100 * 100) / 100,
    peers: torrent.numPeers,
    downloaded: prettyBytes(torrent.downloaded),
    uploaded: prettyBytes(torrent.uploaded),
    total: prettyBytes(torrent.length),
    remaining: Math.round(torrent.timeRemaining / 1000), // in seconds
    downloadSpeed: prettyBytes(torrent.downloadSpeed), // String with unit. Is /s
    uploadSpeed: prettyBytes(torrent.uploadSpeed)
  };
};

// Human readable bytes util, credit: webtorrent example
const prettyBytes = (num: number): string => {
  const neg = num < 0;
  const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (neg) num = -num;
  if (num < 1) return (neg ? "-" : "") + num + " B";
  const exponent = Math.min(
    Math.floor(Math.log(num) / Math.log(1000)),
    units.length - 1
  );
  const computedNum = Number((num / Math.pow(1000, exponent)).toFixed(2));
  const unit = units[exponent];
  return (neg ? "-" : "") + computedNum + " " + unit;
};

export const fetchUsersTorrents = (
  torrents: Torrent[],
  user: User
): Torrent[] => {
  return torrents.filter(torrent => torrent.linkedUser === user.username);
};

export const restorePreviousTorrents = async (
  db: Db,
  torrentClient: any,
  downloadPath: string
) => {
  Promise.all(
    await db.users
      .map(async (user: User) => {
        return await fetchUsersTorrents(db.torrents, user).map(
          async (torrent, index) => {
            try {
              console.log("trying to restore torrent", torrent);
              const torrentResult = await addTorrentViaMagnet(
                torrentClient,
                torrent.infoHash,
                `${downloadPath}/${user.username}`
              );
              Object.assign(torrent, { torrent: torrentResult });
              console.log("restored torrent: ", torrent.name);
            } catch (err) {
              console.error(
                "couldn't restore one of the torrents, deleting it ..."
              );
              db.torrents.splice(index, 1);
            }
          }
        );
      })
      .reduce((previous, current) => {
        return { ...previous, ...current };
      })
  )
    .catch(err => {
      console.error("couldn't restore one of the torrents, got error ", err);
    })
    .finally(() => {
      console.log("All previous torrents restaured");
    });
};

export const isValidTorrent = (torrent: any): torrent is Torrent =>
  torrent && torrent.infoHash && torrent.linkedUser && torrent.name;

export const isValidTorrentList = (torrents: any): torrents is Torrent[] =>
  torrents &&
  Array.isArray(torrents) &&
  torrents.every(torrent => isValidTorrent(torrent));
