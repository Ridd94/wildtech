/** Party votes: the GM poses a question, every joined player answers on their own sheet. */

export const VOTE_MAX_OPTIONS = 6;
export const VOTE_MIN_OPTIONS = 2;
export const VOTE_QUESTION_MAX = 300;
export const VOTE_OPTION_MAX = 120;

export type VoteStatus = "open" | "closed";

export type ActiveVote = {
  id: string;
  question: string;
  /** Answer labels, in display order. Ballots reference these by index. */
  options: string[];
  status: VoteStatus;
  createdAt?: unknown;
  closedAt?: unknown;
};

/** A player's ballot, stored on their own character doc alongside pendingItemUse. */
export type VoteChoice = {
  voteId: string;
  optionIndex: number;
  votedAt?: unknown;
};

export type VoteTally = {
  /** Vote count per option, index-aligned with the vote's options array. */
  counts: number[];
  /** Display names of who picked each option, index-aligned. */
  voters: string[][];
  totalVotes: number;
  notVoted: string[];
};

type TallyableCharacter = {
  name?: string;
  voteChoice?: VoteChoice | null;
};

/**
 * Count ballots for a vote. Ballots naming a different voteId are ignored, so a
 * stale choice left over from a previous vote never leaks into the new one.
 */
export function tallyVote(vote: ActiveVote, roster: TallyableCharacter[]): VoteTally {
  const counts = vote.options.map(() => 0);
  const voters: string[][] = vote.options.map(() => []);
  const notVoted: string[] = [];

  for (const character of roster) {
    const name = character.name || "Unnamed";
    const choice = character.voteChoice;

    if (!choice || choice.voteId !== vote.id) {
      notVoted.push(name);
      continue;
    }

    const index = choice.optionIndex;
    if (!Number.isInteger(index) || index < 0 || index >= vote.options.length) {
      notVoted.push(name);
      continue;
    }

    counts[index] += 1;
    voters[index].push(name);
  }

  return {
    counts,
    voters,
    totalVotes: counts.reduce((sum, n) => sum + n, 0),
    notVoted,
  };
}

/**
 * Trim and validate GM-authored options, dropping blanks so empty inputs in the
 * compose form don't become empty buttons on the players' screens.
 */
export function normaliseVoteOptions(raw: string[]): string[] {
  return raw
    .map((option) => option.trim().slice(0, VOTE_OPTION_MAX))
    .filter((option) => option.length > 0)
    .slice(0, VOTE_MAX_OPTIONS);
}

export function describeVoteProblem(question: string, options: string[]): string {
  if (!question.trim()) return "Give the vote a question.";
  if (options.length < VOTE_MIN_OPTIONS) return `Give the vote at least ${VOTE_MIN_OPTIONS} options.`;
  return "";
}
