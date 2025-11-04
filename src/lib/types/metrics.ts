export type CircleMetric =
  | "orders"
  | "profit"
  | "sales"
  | "quantity"
  | "shipping"
  | "discount";
export type HeatmapMetric =
  | "shipping_mode"
  | "segment"
  | "orders"
  | "category"
  | "sales"
  | "discounts"
  | "profit"
  | "shipping_cost"
  | "priority"
  | "quantity";

export const circleMetricLabels: Record<CircleMetric, string> = {
  orders: "Total Number of Orders",
  profit: "Seller's Profit",
  sales: "Sales Cost",
  quantity: "Quantity Bought",
  shipping: "Shipping Cost",
  discount: "Discounts",
};

export const heatmapMetricLabels: Record<HeatmapMetric, string> = {
  shipping_mode: "Shipping Mode",
  segment: "Segment",
  orders: "Total Number of Orders",
  category: "Order Category",
  sales: "Sales",
  discounts: "Discounts",
  profit: "Seller's Profit",
  shipping_cost: "Shipping Cost",
  priority: "Order Priority",
  quantity: "Quantity Bought",
};
