export interface UserRecord {
  coins: number;
  crystals: number;
  lastSalary: number;
  lastDaily: number;
  streak: number;
}

const users = new Map<number, UserRecord>();

export function getOrCreateUser(userId: number): UserRecord {
  if (!users.has(userId)) {
    users.set(userId, {
      coins: 500,
      crystals: 10,
      lastSalary: 0,
      lastDaily: 0,
      streak: 1,
    });
  }
  return users.get(userId)!;
}

export function clearAllUsers() {
  users.clear();
}
