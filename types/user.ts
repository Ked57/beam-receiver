export type User = {
  username: string;
  hashedPassword: string;
  mustChangePassword: boolean;
  token?: string;
};
