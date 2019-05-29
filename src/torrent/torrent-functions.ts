export const addTorrentViaMagnet = (
  torrentClient: any,
  source: any,
  path: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      torrentClient.add(source, { path }, (torrent: any) => {
        torrent.on("done", () => {
          console.log("torrent download finished");
        });
        console.log("Torrent added");
        resolve(torrent);
      });
    } catch (err) {
      reject(err);
    }
  });
};
