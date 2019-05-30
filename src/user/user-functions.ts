import { User } from "user";

export const isValidUserList = (users: any): users is User[] =>
  users && Array.isArray(users) && users.every(user => isValidUser(user));

export const isValidUser = (user: any): user is User =>
  user && user.username && user.hashedPassword && user.mustChangePassword;
