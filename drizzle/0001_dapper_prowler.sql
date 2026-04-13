CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`applicantId` int NOT NULL,
	`introduction` text,
	`status` enum('대기중','수락','거절') NOT NULL DEFAULT '대기중',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_application` UNIQUE(`postId`,`applicantId`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`category` enum('동아리','학회','스터디') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`capacity` int NOT NULL DEFAULT 10,
	`deadline` timestamp,
	`keywords` text,
	`status` enum('모집중','마감') NOT NULL DEFAULT '모집중',
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`department` varchar(100),
	`grade` enum('1','2','3','4','대학원'),
	`bio` text,
	`keywords` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
