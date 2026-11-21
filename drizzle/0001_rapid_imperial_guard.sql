CREATE TABLE `analytics_pageviews` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`at` integer NOT NULL,
	`path` text NOT NULL,
	`source` text NOT NULL,
	`device` text NOT NULL,
	`returning` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_pageviews_at` ON `analytics_pageviews` (`at`);--> statement-breakpoint
CREATE INDEX `analytics_pageviews_visitor_at` ON `analytics_pageviews` (`visitor_id`,`at`);--> statement-breakpoint
CREATE TABLE `analytics_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_visitors_last_seen` ON `analytics_visitors` (`last_seen`);