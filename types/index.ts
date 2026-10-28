export type CategoryId =
  | "poulpe"
  | "pelou"
  | "pizzas"
  | "sandwichs"
  | "m9ila"
  | "boissons";

export type Store = {
  id: string;
  name: string;
  city: string;
  area: string;
  phone: string;
  deliveryFee: number;
  hours: string;
  lat: number;
  lng: number;
};

export type ProductOption = {
  id: string;
  name: string;
  included: boolean;
  extraPrice: number;
};

export type PlateChoice = {
  id: string;
  name: string;
  qty: number;
  included: number;
};

export type Product = {
  id: string;
  storeIds: string[];
  category: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  spicyChoice?: boolean;
  options?: ProductOption[];
};

export type MenuGroup = {
  id: string;
  label: string;
  products: Product[];
};

export type MenuSection = {
  id: string;
  label: string;
  products: Product[];
  groups: MenuGroup[];
};

export type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
  comment?: string;
  options?: PlateChoice[];
  spicy?: boolean;
  spicyChoice?: boolean;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

export type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  address: string;
  location?: { lat: number; lng: number };
};

export type OrderItem = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  comment?: string;
  options?: PlateChoice[];
  spicy?: boolean;
};

export type Order = {
  id: string;
  storeId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: Customer;
  note?: string;
  paymentMethod: "cash_on_delivery";
  status: OrderStatus;
  createdAt: string;
};
