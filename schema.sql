drop table if exists users;
create table users (
    username varchar(30) primary key,
    password varchar(30) not null
);

drop table if exists user_stats;
create table user_stats (
    wins integer default 0,
    losses integer default 0,
    draws integer default 0,
    username varchar(30),
    foreign key(username) references users(username)
);

drop table if exists games;
create table games (
	id integer primary key,
	black varchar(30) not null,
	white varchar(30) not null,
	winner varchar(30),
	score varchar(50)
);
