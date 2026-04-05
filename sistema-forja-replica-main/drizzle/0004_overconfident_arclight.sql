CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('checking','savings','investment','wallet') NOT NULL DEFAULT 'checking',
	`balance` float NOT NULL DEFAULT 0,
	`icon` varchar(10) NOT NULL DEFAULT '🏦',
	`color` varchar(20) NOT NULL DEFAULT '#3B82F6',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`monthlyLimit` float NOT NULL,
	`alertAt` int NOT NULL DEFAULT 80,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budget_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`color` varchar(20) NOT NULL DEFAULT '#FBBF24',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`brand` varchar(50) NOT NULL DEFAULT 'Visa',
	`type` enum('credit','debit') NOT NULL DEFAULT 'credit',
	`lastDigits` varchar(4),
	`cardLimit` float DEFAULT 0,
	`closingDay` int DEFAULT 1,
	`dueDay` int DEFAULT 10,
	`color` varchar(20) NOT NULL DEFAULT '#EF4444',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`estimatedPrice` float,
	`category` varchar(100),
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('pending','bought','cancelled') NOT NULL DEFAULT 'pending',
	`link` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopping_items_id` PRIMARY KEY(`id`)
);
