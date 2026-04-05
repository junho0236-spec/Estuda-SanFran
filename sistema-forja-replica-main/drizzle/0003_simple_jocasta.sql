CREATE TABLE `featured_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slot` int NOT NULL,
	`achievementKey` varchar(100),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featured_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementKey` varchar(100) NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `displayName` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `notifyHabits` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `notifyMetas` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `notifyCommunity` boolean DEFAULT true NOT NULL;