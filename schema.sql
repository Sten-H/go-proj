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
	game_date date not null,
	black varchar(30) not null,
	white varchar(30) not null,
	board_size varchar(10) not null,
	winner varchar(30) not null,
	score varchar(50) not null,
	foreign key(black) references users(username)
	foreign key(white) references users(username)
);
create index player_index on games(black, white);
