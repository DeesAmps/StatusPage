// Simple in-memory user store for demo; replace with DB in production
export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export const users: User[] = [];

export function findUserByEmail(email: string) {
  return users.find(u => u.email === email);
}

export function addUser(user: User) {
  users.push(user);
}
