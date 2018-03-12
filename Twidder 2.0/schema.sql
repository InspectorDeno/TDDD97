-- DROP TABLE users;
CREATE TABLE IF NOT EXISTS users (
  email text primary key,
  password text,
  firstname text,
  familyname text,
  gender text,
  city text,
  country text,
  profile_pic text
);

-- DROP TABLE logged_in_users;
CREATE TABLE IF NOT EXISTS logged_in_users (
	email text primary key,
	token text
);

CREATE TABLE IF NOT EXISTS messages (
	id integer PRIMARY KEY AUTOINCREMENT,
	content text,
	from_user text not null,
	to_user text not null
);

-- DROP TABLE media;
CREATE TABLE IF NOT EXISTS media (
  id integer PRIMARY KEY AUTOINCREMENT,
  email text,
  path text,
  UNIQUE (email,path)
)