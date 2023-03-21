CREATE TABLE public.voting_results (
	id bigint NOT NULL,
	"name" varchar NOT NULL,
	votes bigint NOT NULL DEFAULT 0,
	CONSTRAINT voting_results_pk PRIMARY KEY (id)
);
CREATE INDEX voting_results_votes_idx ON public.voting_results (votes);
