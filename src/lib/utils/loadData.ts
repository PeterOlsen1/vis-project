import type { Order } from "@data-types/order";
import Papa from "papaparse";

function orderFromCSV(csv: any): Order {
    return {
        rowId: csv['Row ID'],
        orderId: csv['Order ID'],
        orderDate: new Date(csv['Order Date']),
        shipDate: new Date(csv['Ship Date']),
        shipMode: csv['Ship Mode'],
        customerId: csv['Customer ID'],
        customerName: csv['Customer Name'],
        segment: csv['Segment'],
        postalCode: csv['Postal Code'] !== null && csv['Postal Code'] !== undefined ? csv['Postal Code'] : '',
        city: csv['City'],
        state: csv['State'],
        country: csv['Country'],
        region: csv['Region'],
        market: csv['Market'],
        productId: csv['Product ID'],
        productName: csv['Product Name'],
        subCategory: csv['Sub-Category'],
        category: csv['Category'],
        sales: csv['Sales'],
        quantity: csv['Quantity'],
        discount: csv['Discount'],
        profit: csv['Profit'],
        shippingCost: csv['Shipping Cost'],
        orderPriority: csv['Order Priority'],
    }
}

export async function loadData(): Promise<Order[]> {
  const resp = await fetch('/data/orders.csv');
  const text = await resp.text();
  const csv = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  }).data ?? [];
  return csv.map(orderFromCSV);
}

