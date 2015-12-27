drop table if exists users;
create table users (
username varchar(30) primary key,
password varchar(30) not null
);
