CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`at` integer NOT NULL,
	`event` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_at` ON `analytics_events` (`at`);--> statement-breakpoint
CREATE INDEX `analytics_events_visitor_at` ON `analytics_events` (`visitor_id`,`at`);