import fs from "fs";
import { Db } from "db";
import { isValidUserList } from "../user/user-functions";
import { User } from "user";

export const loadDb = (path: string) => {
  try {
    const content = JSON.parse(fs.readFileSync(path, "utf8"));
    if (!isValidDb(content)) {
      throw new Error("Db format is not valid");
    }
    return content;
  } catch (err) {
    console.error("Error parsing config", err);
  }
};

export const generateEmptyDB = (): Db => {
  return {
    users: []
  };
};

export const registerUser = (db: Db, user: User) => {
  return new Promise((resolve, reject) => {
    if (db.users.some(u => u.username === user.username)) {
      throw new Error("An user with this username already exists");
    }
    db.users.push(user);
    //save user and resolve
    console.log(user);
    resolve();
  });
};

export const saveDb = (db: Db, path: string) =>
  fs.writeFile(path, JSON.stringify(db), "utf8", () =>
    console.log("Successfuly saved database file")
  );

export const findUser = (db: Db, username: string) => {
  const user = db.users.find(u => u.username === username);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export const findUserViaToken = (db: Db, token: string) => {
  const user = db.users.find(u => u.token === token);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

const isValidDb = (db: any): db is Db =>
  db && db.users && isValidUserList(db.users);
