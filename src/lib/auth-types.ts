export type Role = "employee" | "manager";

export type SessionUser = {
  email: string;
  name: string;
  role: Role;
  /** Present for employees - practice / diagnosis bind to this id. */
  repId: string | null;
};

export type DemoAccount = SessionUser & {
  /** Short label for Fill buttons */
  fillLabel: string;
};
