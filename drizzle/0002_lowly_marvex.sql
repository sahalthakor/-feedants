ALTER TABLE `competitions` ADD `winnersJson` text NULL, ADD `rewardsJson` text NULL;
--> statement-breakpoint
UPDATE `competitions` SET `winnersJson` = '[]', `rewardsJson` = '[]' WHERE `winnersJson` IS NULL OR `rewardsJson` IS NULL;
--> statement-breakpoint
ALTER TABLE `competitions` MODIFY `winnersJson` text NOT NULL, MODIFY `rewardsJson` text NOT NULL;
