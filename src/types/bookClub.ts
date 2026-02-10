export interface BookClub {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface BookClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface BookClubSuggestion {
  id: string;
  clubId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  suggestedBy: string;
  status: 'suggested' | 'reading' | 'read';
  createdAt: string;
  finishedAt: string | null;
  voteCount?: number;
  hasVoted?: boolean;
}

export interface BookClubVote {
  id: string;
  suggestionId: string;
  userId: string;
  createdAt: string;
}
