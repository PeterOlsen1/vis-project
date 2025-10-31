import { dataEndDate, dataStartDate, orderData } from "./mapStates.svelte";

export const normalizeCountryName = (name: string): string => {
    // dataset country name : geography country name
    const countryMap: Record<string, string> = {
        "Guinea-Bissau": "Guinea Bissau",
        "Serbia": "Republic of Serbia",
        "Tanzania": "United Republic of Tanzania",
        "United States": "USA",
        "United Kingdom": "England",
        "Myanmar (Burma)": "Myanmar",
    };
    return countryMap[name] || name;
};

export const getCircleSize = (v: number): number => {
    return Math.sqrt(v) * 1.5;
}

export const getHoveredCircleSize = (v: number): number => {
    return Math.sqrt(v) * 1.5;
}

export const loadStartEndDate = () => {
    const orders = orderData.state;
    let lowestDate = new Date();
    lowestDate.setFullYear(2500); // will break in like 500 years...

    let highestDate = new Date();
    highestDate.setFullYear(1900);

    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        if (order.orderDate > highestDate) {
            highestDate = order.orderDate;
        }
        else if (order.orderDate < lowestDate) {
            lowestDate = order.orderDate;
        }
    }

    dataEndDate.state = highestDate;
    dataStartDate.state = lowestDate;
}