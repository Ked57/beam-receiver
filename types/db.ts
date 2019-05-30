import { User } from "user";
import { Torrent } from "torrent";

export type Db = {
  users: User[];
  torrents: Torrent[];
};
