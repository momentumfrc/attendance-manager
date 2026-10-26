-- Separate database for the PHPUnit suite, so running tests never wipes the dev database.
-- Runs automatically when the mariadb volume is first created.
CREATE DATABASE IF NOT EXISTS `attendance_api_testing`;
GRANT ALL PRIVILEGES ON `attendance_api_testing`.* TO 'attendance_user'@'%';
