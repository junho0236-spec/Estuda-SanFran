CREATE TABLE `focus_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#EF4444',
	`totalMinutes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`projectName` varchar(255) NOT NULL DEFAULT 'Sem projeto',
	`duration` int NOT NULL,
	`type` enum('focus','break') NOT NULL DEFAULT 'focus',
	`date` varchar(10) NOT NULL,
	`time` varchar(5) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`category` varchar(100),
	`icon` varchar(10) NOT NULL DEFAULT '🎯',
	`deadline` varchar(10),
	`status` enum('active','completed','paused') NOT NULL DEFAULT 'active',
	`progress` int NOT NULL DEFAULT 0,
	`milestones` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `habit_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habitId` int NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `habit_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(10) NOT NULL DEFAULT '💪',
	`frequency` enum('daily','weekly','custom') NOT NULL DEFAULT 'daily',
	`dailyGoal` int NOT NULL DEFAULT 1,
	`customDays` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `habits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`icon` varchar(10) NOT NULL DEFAULT '🔔',
	`color` varchar(50) NOT NULL DEFAULT 'text-yellow-400',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`date` varchar(10) NOT NULL,
	`time` varchar(5),
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`isCompleted` boolean NOT NULL DEFAULT false,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`recurringDays` json,
	`xpReward` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`amount` float NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'Outros',
	`date` varchar(10) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`coins` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`streak` int NOT NULL DEFAULT 0,
	`waterMl` int NOT NULL DEFAULT 0,
	`waterGoalMl` int NOT NULL DEFAULT 2000,
	`sleepRating` varchar(20),
	`energyRating` varchar(20),
	`humorRating` varchar(20),
	`focusHoursGoal` int NOT NULL DEFAULT 40,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `water_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`amountMl` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `water_logs_id` PRIMARY KEY(`id`)
);
