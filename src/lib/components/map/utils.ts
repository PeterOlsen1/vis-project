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