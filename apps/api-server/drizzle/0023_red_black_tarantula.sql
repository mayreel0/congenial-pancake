CREATE INDEX "replies_author_id_idx" ON "replies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "replies_guest_id_idx" ON "replies" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "answer_interactions_author_id_idx" ON "answer_interactions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "answer_interactions_guest_id_idx" ON "answer_interactions" USING btree ("guest_id");