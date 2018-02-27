CREATE TABLE IF NOT EXISTS users (
  email text primary key,
  password text,
  firstname text,
  familyname text,
  gender text,
  city text,
  country text
);

CREATE TABLE IF NOT EXISTS logged_in_users (
	email text primary key,
	token text
);

CREATE TABLE IF NOT EXISTS messages (
	id integer primary key autoincrement,
	content text,
	from_user text not null,
	to_user text not null
);