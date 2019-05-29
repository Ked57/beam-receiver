export const addTorrentViaMagnet = (
  torrentClient: any,
  magnet: string,
  path: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      torrentClient.add(magnet, { path }, function(torrent: any) {
        torrent.on("done", function() {
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
