CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`format` varchar(80) NOT NULL,
	`prizePool` int NOT NULL,
	`entryFee` int NOT NULL,
	`capacity` int NOT NULL,
	`booked` int NOT NULL DEFAULT 0,
	`status` varchar(30) NOT NULL DEFAULT 'open',
	`registrationDeadline` timestamp NOT NULL,
	`submissionStartsAt` timestamp NOT NULL,
	`submissionEndsAt` timestamp NOT NULL,
	`resultDate` timestamp NOT NULL,
	`judgeName` varchar(120) NOT NULL,
	`judgeRole` varchar(180) NOT NULL,
	`judgeExperience` varchar(80) NOT NULL,
	`judgeImage` text NOT NULL,
	`about` text NOT NULL,
	`judgingParameters` text NOT NULL,
	`rules` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`participantKey` varchar(120) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'registered',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `participant_competition_unique` UNIQUE(`competitionId`,`participantKey`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`participantKey` varchar(120) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'uploaded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_participant_unique` UNIQUE(`competitionId`,`participantKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'user';