export type Position = 'east' | 'south' | 'west' | 'north';
export type PlayerType = 'manual' | 'friend' | 'id' | 'email';

export interface Player {
  id: string;
  type: PlayerType;
  name: string;
  userId?: string;
  email?: string;
  position: Position;
  isCurrentUser: boolean;
}

export interface Friend {
  id: string;
  friend: {
    id: string;
    name: string | null;
    iconPath: string | null;
  };
}

export interface GameStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (players: Player[], settings: GameSettings) => void;
}

export interface GameSettings {
  initialPoints: number;
  returnPoints: number;
  chipPoints: number;
  yakitoriPoints: number;
  uma1: number;
  uma2: number;
  uma3: number;
  uma4: number;
  chipEnabled: boolean;
  yakitoriEnabled: boolean;
  yakitoriMode: 'distribution' | 'winner_takes_all'; // 'distribution': 分配モード, 'winner_takes_all': 総どりモード
} 