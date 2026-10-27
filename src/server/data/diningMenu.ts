export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: "GRILL_KEBAB" | "MAIN_COURSE" | "APPETIZER" | "BEVERAGE" | "DESSERT" | "BAKERY";
  rate: number;
  description?: string;
  isAvailable: boolean;
}

export const CLUB_DINING_MENU: MenuItem[] = [
  // GRILL & KEBAB
  {
    id: "menu-01",
    code: "G01",
    name: "Chicken Reshmi Kebab (4 Pcs)",
    category: "GRILL_KEBAB",
    rate: 280,
    description: "Tender boneless chicken marinated in curd, cashew cream & aromatic spices",
    isAvailable: true,
  },
  {
    id: "menu-02",
    code: "G02",
    name: "Special Mutton Boti Kebab",
    category: "GRILL_KEBAB",
    rate: 380,
    description: "Chargrilled spiced mutton cubes with green mint chutney",
    isAvailable: true,
  },
  {
    id: "menu-03",
    code: "G03",
    name: "Beef Seekh Kebab (2 Skewers)",
    category: "GRILL_KEBAB",
    rate: 320,
    description: "Minced beef infused with ginger, coriander, and royal garam masala",
    isAvailable: true,
  },
  {
    id: "menu-04",
    code: "G04",
    name: "Grilled Pomfret Fish",
    category: "GRILL_KEBAB",
    rate: 650,
    description: "Whole fresh pomfret marinated with lemon, mustard & crushed pepper",
    isAvailable: true,
  },

  // MAIN COURSES & RICE
  {
    id: "menu-05",
    code: "M01",
    name: "Club Special Mutton Kacchi Biryani",
    category: "MAIN_COURSE",
    rate: 480,
    description: "Basmati rice layered with marinated tender mutton, potatoes & saffron",
    isAvailable: true,
  },
  {
    id: "menu-06",
    code: "M02",
    name: "Chicken Roast with Polao & Egg",
    category: "MAIN_COURSE",
    rate: 350,
    description: "Traditional Shahi chicken roast served with chinigura polao",
    isAvailable: true,
  },
  {
    id: "menu-07",
    code: "M03",
    name: "Boneless Beef Bhuna",
    category: "MAIN_COURSE",
    rate: 360,
    description: "Slow-cooked spiced beef curry in thick caramelized onion gravy",
    isAvailable: true,
  },
  {
    id: "menu-08",
    code: "M04",
    name: "Butter Chicken Masala",
    category: "MAIN_COURSE",
    rate: 340,
    description: "Smoked tandoori chicken cooked in rich velvety tomato makhani sauce",
    isAvailable: true,
  },
  {
    id: "menu-09",
    code: "M05",
    name: "Butter Naan / Garlic Naan",
    category: "MAIN_COURSE",
    rate: 60,
    description: "Clay oven baked flatbread brushed with country butter",
    isAvailable: true,
  },

  // APPETIZERS & SOUPS
  {
    id: "menu-10",
    code: "A01",
    name: "Club Special Corn Soup",
    category: "APPETIZER",
    rate: 180,
    description: "Classic thick chicken & sweet corn soup with egg ribbons",
    isAvailable: true,
  },
  {
    id: "menu-11",
    code: "A02",
    name: "Crispy Wonton (6 Pcs)",
    category: "APPETIZER",
    rate: 220,
    description: "Golden fried stuffed wontons served with sweet chili dip",
    isAvailable: true,
  },
  {
    id: "menu-12",
    code: "A03",
    name: "Chicken Cashewnut Salad",
    category: "APPETIZER",
    rate: 320,
    description: "Fried chicken, roasted cashewnuts, bell peppers & tangy tamarind glaze",
    isAvailable: true,
  },

  // BEVERAGES
  {
    id: "menu-13",
    code: "B01",
    name: "Fresh Lime Soda (Sweet & Salt)",
    category: "BEVERAGE",
    rate: 60,
    description: "Fresh squeezed lime with chilled sparkling soda",
    isAvailable: true,
  },
  {
    id: "menu-14",
    code: "B02",
    name: "Raw Mango / Mint Lemonade",
    category: "BEVERAGE",
    rate: 90,
    description: "Blended mint, roasted cumin, lime, and crushed ice",
    isAvailable: true,
  },
  {
    id: "menu-15",
    code: "B03",
    name: "Special Club Milk Tea",
    category: "BEVERAGE",
    rate: 40,
    description: "Freshly brewed strong Sylhet tea with creamy reduced milk",
    isAvailable: true,
  },
  {
    id: "menu-16",
    code: "B04",
    name: "Cappuccino / Espresso",
    category: "BEVERAGE",
    rate: 140,
    description: "Italian roast espresso topped with silky microfoam",
    isAvailable: true,
  },

  // DESSERT & BAKERY
  {
    id: "menu-17",
    code: "D01",
    name: "Shahi Firni in Clay Pot",
    category: "DESSERT",
    rate: 90,
    description: "Fragrant rice pudding flavored with cardamom, saffron & pistachio",
    isAvailable: true,
  },
  {
    id: "menu-18",
    code: "D02",
    name: "Gulab Jamun with Vanilla Ice Cream",
    category: "DESSERT",
    rate: 120,
    description: "Hot syrup-soaked milk dumplings served with premium vanilla scoop",
    isAvailable: true,
  },
];
