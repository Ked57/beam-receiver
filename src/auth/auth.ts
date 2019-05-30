import bcrypt from "bcrypt";
import { User } from "user";
import { Db } from "db";
import uuid from "uuid/v4";
import { findUserViaToken } from "../db/db-functions.";
import { findUser } from "../db/db-functions.";

export const parseBasicAuth = (authHeader: string) => {
  const base64arg = authHeader.split(" ")[1];
  if (!base64arg) {
    throw new Error("Error parsing basic auth header, format seems incorrect");
  }
  return Buffer.from(base64arg, "base64")
    .toString("utf-8")
    .split(":");
};

export const parseBearerAuth = (authHeader: string) => {
  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new Error("Error parsing bearer auth header, format seems incorrect");
  }
  return token;
};

export const logout = (db: Db, token: string) => {
  const user = findUserViaToken(db, token);
  Object.assign(user, { token: undefined });
};

export const createUser = async (
  username: string,
  password: string,
  saltRounds: number
): Promise<User> => {
  return {
    username,
    hashedPassword: await hashPassword(password, saltRounds),
    mustChangePassword: true
  };
};

export const authenticate = (db: Db, username: string, password: string) => {
  const user = findUser(db, username);
  return bcrypt.compare(password, user.hashedPassword);
};

export const generateToken = (db: Db, username: string) => {
  const dbUser = db.users.find(u => u.username === username);
  if (!dbUser) {
    throw new Error("Couldn't find user");
  }
  const token = uuid();
  Object.assign(dbUser, { token });
  return token;
};

const hashPassword = async (password: string, saltRounds: number) => {
  return await bcrypt.hash(password, saltRounds);
};
