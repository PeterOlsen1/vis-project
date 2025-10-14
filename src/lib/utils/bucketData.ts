import type { Order } from "@data-types/order";

export function bucketByFrequency(orders: Order[]): Record<string, number> {
    const out: Record<string, number> = {};

    for (const order of orders) {
        if (order.country in out) {
            out[order.country] += 1;
        } else {
            out[order.country] = 1;
        }
    }

    return out;
}