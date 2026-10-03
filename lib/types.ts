export type Gender = "Мужской" | "Женский";

export type Profile = {
  fullName: string;
  gender: Gender;
  city: string;
  phone: string;
  telegram: string;
  age: string;
  photo: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "user" | "admin";
  createdAt: string;
  profile: Profile;
};

export type PollOption = {
  id: string;
  title: string;
  subtitle: string;
  photo: string;
};

export type Nomination = {
  id: string;
  title: string;
  description: string;
  maxChoices: number;
  options: PollOption[];
};

export type Poll = {
  title: string;
  subtitle: string;
  deadline: string | null;
  nominations: Nomination[];
};

export type VoteAnswers = Record<string, string[]>;

export type Vote = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  ip: string;
  deviceId: string;
  answers: VoteAnswers;
  submissions: string[];
};

export type ResetCode = {
  email: string;
  code: string;
  expiresAt: string;
};

export type Limits = {
  maxAccountsPerIp: number;
  maxAccountsPerDevice: number;
  maxSubmissionsPer30Min: number;
};

export type Db = {
  users: User[];
  votes: Vote[];
  resets: ResetCode[];
  poll: Poll;
  limits: Limits;
};

export type PublicUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  profile: Profile;
};
