export type PlayerType = 'friend' | 'id' | 'email' | 'manual';
export type Position = 'east' | 'south' | 'west' | 'north';

export interface Friend {
  friend: {
    id: string;
    name: string | null;
  };
}

export interface Player {
  id: string;
  type: PlayerType;
  name: string;
  userId?: string;
  email?: string;
  position: Position;
  isCurrentUser: boolean;
}

export interface GameStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (players: { name: string; userId?: string; position: Position }[]) => void;
} 