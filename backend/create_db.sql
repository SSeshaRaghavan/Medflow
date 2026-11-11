-- Run as postgres superuser:
-- psql -U postgres -f create_db.sql

CREATE USER medflow_user WITH PASSWORD 'medflow_pass';
CREATE DATABASE medflow_db OWNER medflow_user;
GRANT ALL PRIVILEGES ON DATABASE medflow_db TO medflow_user;
\connect medflow_db
GRANT ALL ON SCHEMA public TO medflow_user;

