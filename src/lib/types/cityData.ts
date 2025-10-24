export type City = {
    city: string,
    country: string,
    count: number
}

export type CityData = {
    city: string,
    country: string,
    count: number,
    normalizedCountry: string,
    x: number,
    y: number,
}

export type CityGeoData = {
    city: string,
    country: string,
    lat: number,
    lng: number,
}