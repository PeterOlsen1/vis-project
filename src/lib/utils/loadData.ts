import { asset } from "$app/paths";
import type { Order } from "@data-types/order";
import * as d3 from "d3";
import Papa from "papaparse";

function orderFromCSV(csv: any): Order {
    return {
        rowId: csv["Row ID"],
        orderId: csv["Order ID"],
        orderDate: new Date(csv["Order Date"]),
        shipDate: new Date(csv["Ship Date"]),
        shipMode: csv["Ship Mode"],
        customerId: csv["Customer ID"],
        customerName: csv["Customer Name"],
        segment: csv["Segment"],
        postalCode:
            csv["Postal Code"] !== null && csv["Postal Code"] !== undefined
                ? csv["Postal Code"]
                : "",
        city: csv["City"],
        state: csv["State"],
        country: csv["Country"],
        region: csv["Region"],
        market: csv["Market"],
        productId: csv["Product ID"],
        productName: csv["Product Name"],
        subCategory: csv["Sub-Category"],
        category: csv["Category"],
        sales: csv["Sales"],
        quantity: csv["Quantity"],
        discount: csv["Discount"],
        profit: csv["Profit"],
        shippingCost: csv["Shipping Cost"],
        orderPriority: csv["Order Priority"],
    };
}

// cache data in localStorage
export async function loadData(): Promise<Order[]> {
    // if (localStorage.getItem("orders")) {
    //     const orders = JSON.parse(localStorage.getItem("orders") ?? "[]") as Order[];
    //     return orders;
    // }

    const resp = await fetch(asset("/data/orders.csv"));
    const text = await resp.text();
    const csv =
        Papa.parse<Record<string, any>>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        }).data ?? [];
    
    const ret = csv.map(orderFromCSV);
    // localStorage.setItem("orders", JSON.stringify(ret));
    // return ret.slice(0, 1000);
    return ret;
}

export async function loadGeographyData(): Promise<any> {
    // if (localStorage.getItem("world")) {
    //     const world = JSON.parse(localStorage.getItem("world") ?? "{}");
    //     return world;
    // }

    const world: any = await d3.json(
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
    );
    // localStorage.setItem("world", JSON.stringify(world));
    return world;
}