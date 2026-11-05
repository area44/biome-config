export interface User {
  id: string;
  name: string;
  active: boolean;
}

export function formatUser(user: User): string {
  return `${user.name} (${user.id})`;
}
