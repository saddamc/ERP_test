export interface CardRoomServiceItem {
  id: string;
  code: string;
  name: string;
  category: "CARD_TABLE" | "BILLIARDS" | "CONSUMABLE" | "TOURNAMENT";
  rate: number;
  unit: "HOUR" | "ITEM" | "ENTRY";
  description?: string;
}

export const CARD_ROOM_SERVICES: CardRoomServiceItem[] = [
  {
    id: "cr-01",
    code: "CR-BRG",
    name: "Bridge Table Hourly Session",
    category: "CARD_TABLE",
    rate: 200,
    unit: "HOUR",
    description: "Reserved 4-player Bridge table in Main Card Room",
  },
  {
    id: "cr-02",
    code: "CR-RMY",
    name: "Rummy / General Table Hourly Session",
    category: "CARD_TABLE",
    rate: 150,
    unit: "HOUR",
    description: "Standard card room table with felt mat & score sheets",
  },
  {
    id: "cr-03",
    code: "CR-VIP",
    name: "VIP Card Room Table Session",
    category: "CARD_TABLE",
    rate: 350,
    unit: "HOUR",
    description: "Private executive card room with dedicated attendant",
  },
  {
    id: "cr-04",
    code: "CR-SNK",
    name: "Billiards & Snooker Table Session",
    category: "BILLIARDS",
    rate: 250,
    unit: "HOUR",
    description: "Championship 12ft snooker table with cue ball set",
  },
  {
    id: "cr-05",
    code: "CR-PL9",
    name: "9-Ball Pool Table Session",
    category: "BILLIARDS",
    rate: 200,
    unit: "HOUR",
    description: "Standard American pool table session",
  },
  {
    id: "cr-06",
    code: "CR-DCK",
    name: "Premium Plastic Playing Card Decks (2 Packets)",
    category: "CONSUMABLE",
    rate: 300,
    unit: "ITEM",
    description: "Club official 100% plastic washable casino decks",
  },
  {
    id: "cr-07",
    code: "CR-TRN",
    name: "Annual Club Bridge Tournament Registration",
    category: "TOURNAMENT",
    rate: 1000,
    unit: "ENTRY",
    description: "Official registration fee for Club Championship tournament",
  },
];
